/**
 * GET  /api/auth/redefinir-senha?token=...  — confere se o link ainda vale
 * POST /api/auth/redefinir-senha  { token, password } — grava a senha nova
 *
 * O GET existe para a tela poder dizer "este link expirou" ANTES de a pessoa
 * digitar a senha duas vezes e só então descobrir.
 */

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";
import { hashToken, validatePassword } from "@/lib/password-reset";

/** Busca o token e diz por que ele nao serve, se for o caso. */
async function loadToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, active: true } } },
  });

  if (!record) return { ok: false as const, error: "Link invalido." };
  if (record.usedAt) return { ok: false as const, error: "Este link ja foi usado." };
  if (record.expiresAt < new Date()) return { ok: false as const, error: "Este link expirou." };
  if (!record.user.active) return { ok: false as const, error: "Conta inativa." };

  return { ok: true as const, record };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "Link invalido." }, { status: 400 });
  }

  // Throttle tambem no GET: sem isso daria para varrer tokens medindo qual
  // responde "valido".
  if (isRateLimited(`redefinir-check:${getClientIp(request)}`, { limit: 30, windowMs: 60 * 60_000 })) {
    return rateLimitResponse();
  }

  try {
    const result = await loadToken(token);
    if (!result.ok) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
    }
    // Só o primeiro nome: o suficiente para a tela confirmar de quem é a
    // conta, sem expor o e-mail para quem tiver o link.
    return NextResponse.json({
      valid: true,
      name: result.record.user.name.split(" ")[0],
    });
  } catch (error) {
    console.error("[redefinir-senha GET]", error);
    return NextResponse.json({ valid: false, error: "Erro ao validar o link." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (isRateLimited(`redefinir-senha:${getClientIp(request)}`, { limit: 10, windowMs: 60 * 60_000 })) {
    return rateLimitResponse();
  }

  try {
    const body = (await request.json()) as { token?: string; password?: string };

    if (!body.token) {
      return NextResponse.json({ error: "Link invalido." }, { status: 400 });
    }

    const passwordError = validatePassword(body.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const result = await loadToken(body.token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { record } = result;
    const passwordHash = await bcrypt.hash(body.password as string, 10);

    // Gravar a senha e queimar o token na MESMA transacao: se o update da
    // senha passasse e a marcacao falhasse, o link continuaria valendo.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      // Qualquer outro pedido em aberto tambem morre: trocar a senha invalida
      // todos os links pendentes.
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[redefinir-senha POST]", error);
    return NextResponse.json({ error: "Nao foi possivel redefinir a senha." }, { status: 503 });
  }
}
