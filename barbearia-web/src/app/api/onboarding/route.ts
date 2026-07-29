import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";

type OnboardingPayload = {
  barbershopName?: string;
  slug?: string;
  ownerName?: string;
  email?: string;
  password?: string;
  phone?: string;
  whatsapp?: string;
  couponCode?: string;
};

export async function POST(request: Request) {
  // M6: throttle por IP — 5 onboardings por hora (evita criacao em massa).
  if (isRateLimited(`onboarding:${getClientIp(request)}`, { limit: 5, windowMs: 60 * 60_000 })) {
    return rateLimitResponse();
  }

  try {
    const payload = (await request.json()) as OnboardingPayload;

    const barbershopName = payload.barbershopName?.trim();
    const slug = payload.slug?.trim().toLowerCase();
    const ownerName = payload.ownerName?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password?.toString();

    if (!barbershopName || !slug || !ownerName || !email || !password) {
      return NextResponse.json({ error: "Preencha os campos obrigatorios." }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug invalido. Use apenas letras minusculas, numeros e hifens." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 8 caracteres." },
        { status: 400 },
      );
    }

    const existingBarbershop = await prisma.barbershop.findUnique({ where: { slug } });

    if (existingBarbershop) {
      return NextResponse.json({ error: "Slug da barbearia ja existe." }, { status: 409 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        memberships: {
          where: { role: UserRole.SUPERADMIN, active: true },
          select: { id: true },
        },
      },
    });

    /**
     * E-mail de SUPERADMIN nao abre barbearia.
     *
     * A checagem seguinte ("e-mail ja cadastrado") ja barraria este caso hoje,
     * porque o onboarding recusa qualquer e-mail existente. Mas ela e uma
     * regra de outro assunto: no dia em que existir "usuario existente cria
     * uma segunda barbearia" — uma evolucao natural —, a protecao do admin
     * sumiria junto, sem ninguem perceber.
     *
     * Por isso a verificacao e explicita e vem ANTES: e uma invariante do
     * sistema, nao um efeito colateral de outra regra.
     *
     * A mensagem nao diz "este e-mail e de um administrador": isso confirmaria
     * a quem esta sondando que aquele endereco tem poder no sistema.
     */
    if (existingUser && existingUser.memberships.length > 0) {
      return NextResponse.json(
        { error: "Este e-mail nao pode ser usado para criar uma barbearia." },
        { status: 409 },
      );
    }

    if (existingUser) {
      return NextResponse.json({ error: "E-mail ja cadastrado." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // B3: o cupom do revendedor e resolvido ANTES da transacao (so leitura) e
    // GRAVADO DENTRO dela. Antes o upsert rodava depois, com `.catch(() => null)`:
    // se falhasse, a barbearia nascia sem vinculo e ninguem ficava sabendo —
    // comissao perdida em silencio.
    //
    // Cupom inexistente nao derruba o cadastro: a barbearia e criada mesmo
    // assim, e a resposta avisa que o cupom foi ignorado.
    const couponCode = payload.couponCode?.trim().toUpperCase() || null;
    let reseller: { id: string } | null = null;
    if (couponCode) {
      reseller = await prisma.reseller.findUnique({
        where: { couponCode },
        select: { id: true },
      });
    }

    await prisma.$transaction(async (transaction) => {
      const barbershop = await transaction.barbershop.create({
        data: {
          name: barbershopName,
          slug,
          couponCode: reseller ? couponCode : null,
          phone: payload.phone?.trim() || null,
          whatsapp: payload.whatsapp?.trim() || null,
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const user = await transaction.user.create({
        data: {
          name: ownerName,
          email,
          phone: payload.phone?.trim() || null,
          passwordHash,
        },
      });

      await transaction.barbershopUser.create({
        data: {
          barbershopId: barbershop.id,
          userId: user.id,
          role: UserRole.OWNER,
        },
      });

      if (reseller && couponCode) {
        await transaction.barbershopReseller.create({
          data: {
            barbershopId: barbershop.id,
            resellerId: reseller.id,
            couponCode,
          },
        });
      }
    });

    return NextResponse.json(
      {
        ok: true,
        // Feedback honesto: quem digitou um cupom errado precisa saber.
        ...(couponCode && !reseller
          ? { warning: "Cupom nao encontrado. A barbearia foi criada sem vinculo de revendedor." }
          : {}),
        ...(reseller ? { couponApplied: couponCode } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada no onboarding.";
    const isDatabaseError = message.includes("Can't reach database server") || message.includes("connect");

    return NextResponse.json(
      {
        error: isDatabaseError
          ? "Banco de dados indisponivel no momento. Inicie o PostgreSQL local e tente novamente."
          : "Nao foi possivel concluir o onboarding.",
      },
      { status: isDatabaseError ? 503 : 500 },
    );
  }
}