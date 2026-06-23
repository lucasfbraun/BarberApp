import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

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

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json({ error: "E-mail ja cadastrado." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (transaction) => {
      const barbershop = await transaction.barbershop.create({
        data: {
          name: barbershopName,
          slug,
          phone: payload.phone?.trim() || null,
          whatsapp: payload.whatsapp?.trim() || null,
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
    });

    // Link reseller if couponCode provided
    if (payload.couponCode) {
      const code = payload.couponCode.trim().toUpperCase();
      const reseller = await db.reseller.findUnique({ where: { couponCode: code } });
      if (reseller) {
        const barbershop = await prisma.barbershop.findUnique({ where: { slug } });
        if (barbershop) {
          await db.barbershopReseller.upsert({
            where: { barbershopId: barbershop.id },
            create: { barbershopId: barbershop.id, resellerId: reseller.id, couponCode: code },
            update: {},
          }).catch(() => null);
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
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