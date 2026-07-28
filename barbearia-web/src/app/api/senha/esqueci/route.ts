/**
 * POST /api/auth/esqueci-senha  { email }
 *
 * Pede o link de redefinicao (E1).
 *
 * RESPOSTA SEMPRE IGUAL, independente de o e-mail existir. Diferenciar
 * "enviamos" de "e-mail nao cadastrado" transformaria esta rota em um
 * verificador de contas: qualquer um descobriria quem tem cadastro. Por isso o
 * retorno e sempre 200 com a mesma mensagem.
 *
 * Conta que so tem login social nao recebe link — ela nao tem senha para
 * redefinir. Também nesse caso a resposta e a mesma, pelo mesmo motivo.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";
import { appUrl, sendMail } from "@/lib/mailer";
import {
  createResetToken,
  resetEmailBody,
  RESET_TOKEN_TTL_MINUTES,
} from "@/lib/password-reset";

/** Mensagem unica, para nao vazar quais e-mails existem. */
const GENERIC_RESPONSE = {
  ok: true,
  message:
    "Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. Confira também a caixa de spam.",
};

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Dois limites: por IP (impede varredura) e, mais abaixo, por conta
  // (impede encher a caixa de entrada de alguem).
  if (isRateLimited(`esqueci-senha-ip:${ip}`, { limit: 10, windowMs: 60 * 60_000 })) {
    return rateLimitResponse();
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Informe um e-mail valido." }, { status: 400 });
    }

    if (isRateLimited(`esqueci-senha-conta:${email}`, { limit: 3, windowMs: 60 * 60_000 })) {
      // Mesma resposta de sucesso: dizer "muitas tentativas" para este e-mail
      // ja confirmaria que ele existe.
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, active: true, passwordHash: true },
    });

    // Conta inexistente, inativa ou so-social: nada a fazer, resposta igual.
    if (!user || !user.active || !user.passwordHash) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const { token, tokenHash } = createResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);

    // Invalida os pedidos anteriores ainda abertos: se a pessoa clicou tres
    // vezes em "esqueci", so o ultimo link deve funcionar.
    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt, requestIp: ip },
      });
    });

    const link = appUrl(`/redefinir-senha?token=${encodeURIComponent(token)}`);
    const { text, html } = resetEmailBody(user.name.split(" ")[0], link);

    const sent = await sendMail({
      to: user.email,
      subject: "Redefinir sua senha — lbraunapp",
      text,
      html,
    });

    if (!sent.ok) {
      // O token ja foi gravado; sem e-mail ele e inutil. Invalida para nao
      // deixar credencial valida pendurada no banco.
      await prisma.passwordResetToken
        .updateMany({ where: { tokenHash }, data: { usedAt: new Date() } })
        .catch(() => null);

      return NextResponse.json(
        { error: "Nao foi possivel enviar o e-mail agora. Tente novamente em alguns minutos." },
        { status: 503 },
      );
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("[esqueci-senha]", error);
    return NextResponse.json(
      { error: "Nao foi possivel processar o pedido." },
      { status: 503 },
    );
  }
}
