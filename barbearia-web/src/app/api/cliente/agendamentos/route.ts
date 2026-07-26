/**
 * GET /api/cliente/agendamentos
 * Agendamentos do cliente logado em TODAS as barbearias
 * (via registros Customer vinculados ao userId).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCustomer } from "@/lib/auth-guard";

// Cast temporario ate o Prisma Client ser regenerado com Customer.userId (B2).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(request: Request) {
  const ctx = await resolveCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const appointments = await db.appointment.findMany({
      where: { customer: { userId: ctx.userId } },
      include: {
        barbershop: { select: { id: true, name: true, slug: true, logoUrl: true, city: true } },
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true, durationMinutes: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 100,
    });

    const now = new Date();
    type Appt = { startsAt: Date; status: string };
    const upcoming = appointments.filter(
      (a: Appt) => new Date(a.startsAt) >= now && !["CANCELLED", "NO_SHOW", "RESCHEDULED"].includes(a.status),
    );
    const past = appointments.filter(
      (a: Appt) => new Date(a.startsAt) < now || ["CANCELLED", "NO_SHOW", "RESCHEDULED"].includes(a.status),
    );

    return NextResponse.json({ upcoming, past });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar agendamentos." }, { status: 503 });
  }
}
