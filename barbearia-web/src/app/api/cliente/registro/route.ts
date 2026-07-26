/**
 * POST /api/cliente/registro
 * Cadastro do CLIENTE FINAL (sem vinculo com barbearia).
 * Apos criar, o front faz signIn com as mesmas credenciais.
 */

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (isRateLimited(`cliente-registro:${getClientIp(request)}`, { limit: 5, windowMs: 60 * 60_000 })) {
    return rateLimitResponse();
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim() || null;
    const password = body.password?.toString();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Preencha nome, e-mail e senha." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail invalido." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "E-mail ja cadastrado. Faca login." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, phone, passwordHash },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[cliente/registro]", error);
    return NextResponse.json({ error: "Nao foi possivel concluir o cadastro." }, { status: 500 });
  }
}
