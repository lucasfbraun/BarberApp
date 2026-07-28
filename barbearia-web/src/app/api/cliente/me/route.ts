/**
 * GET /api/cliente/me
 * Perfil do cliente logado + ultima barbearia em que agendou.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCustomer } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const ctx = await resolveCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, name: true, email: true, phone: true, lastBarbershopId: true },
    });

    let lastBarbershop = null;
    if (user?.lastBarbershopId) {
      lastBarbershop = await prisma.barbershop.findFirst({
        where: { id: user.lastBarbershopId, status: "ACTIVE" },
        select: {
          id: true, name: true, slug: true, description: true,
          logoUrl: true, coverImageUrl: true, city: true, state: true, primaryColor: true,
        },
      });
    }

    return NextResponse.json({
      user: { id: user?.id, name: user?.name, email: user?.email, phone: user?.phone },
      lastBarbershop,
    });
  } catch {
    return NextResponse.json({ error: "Erro ao carregar perfil." }, { status: 503 });
  }
}
