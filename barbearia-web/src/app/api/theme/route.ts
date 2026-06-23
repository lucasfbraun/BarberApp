import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type ThemePayload = {
  name?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
};

async function resolveBarbershop(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const barbershopId = token?.activeBarbershopId as string | undefined;

  if (!barbershopId) {
    return null;
  }

  const barbershop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
  });

  return barbershop;
}

export async function GET(request: Request) {
  try {
    const barbershop = await resolveBarbershop(request);

    if (!barbershop) {
      return NextResponse.json({ error: "Tenant nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ barbershop });
  } catch {
    return NextResponse.json({ error: "Banco de dados indisponivel no momento." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const barbershop = await resolveBarbershop(request);

    if (!barbershop) {
      return NextResponse.json({ error: "Tenant nao encontrado." }, { status: 404 });
    }

    const payload = (await request.json()) as ThemePayload;

    const updated = await prisma.barbershop.update({
      where: { id: barbershop.id },
      data: {
        name: payload.name?.trim() || barbershop.name,
        description: payload.description?.trim() || null,
        logoUrl: payload.logoUrl?.trim() || null,
        coverImageUrl: payload.coverImageUrl?.trim() || null,
        primaryColor: payload.primaryColor?.trim() || null,
        secondaryColor: payload.secondaryColor?.trim() || null,
        accentColor: payload.accentColor?.trim() || null,
        backgroundColor: payload.backgroundColor?.trim() || null,
        textColor: payload.textColor?.trim() || null,
        borderRadius: payload.borderRadius?.trim() || null,
        fontFamily: payload.fontFamily?.trim() || null,
      },
    });

    return NextResponse.json({ barbershop: updated });
  } catch {
    return NextResponse.json({ error: "Banco de dados indisponivel no momento." }, { status: 503 });
  }
}
