/**
 * GET  /api/agendamentos?date=YYYY-MM-DD&professionalId=
 * POST /api/agendamentos
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { resolveTenant } from "@/lib/auth-guard";

// GET — lista agendamentos do dia (com filtro opcional por profissional)
export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  const professionalId = searchParams.get("professionalId") ?? undefined;

  if (!dateStr) {
    return NextResponse.json({ error: "Parametro 'date' e obrigatorio." }, { status: 400 });
  }

  const startOfDay = new Date(`${dateStr}T00:00:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59`);

  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        barbershopId: ctx.barbershopId,
        startsAt: { gte: startOfDay, lte: endOfDay },
        ...(professionalId ? { professionalId } : {}),
      },
      include: {
        professional: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, durationMinutes: true, price: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return NextResponse.json({ appointments });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar agendamentos." }, { status: 503 });
  }
}

// POST — cria um agendamento (painel interno)
export async function POST(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      professionalId?: string;
      serviceId?: string;
      startsAt: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
      source?: string;
    };

    if (!body.startsAt) {
      return NextResponse.json({ error: "startsAt e obrigatorio." }, { status: 400 });
    }

    const startsAt = new Date(body.startsAt);
    if (isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "startsAt invalido." }, { status: 400 });
    }

    // Duração do serviço
    let durationMinutes = 30;
    if (body.serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: body.serviceId, barbershopId: ctx.barbershopId, active: true },
      });
      if (!service) {
        return NextResponse.json({ error: "Servico nao encontrado." }, { status: 404 });
      }

      if (body.professionalId) {
        const ps = await prisma.professionalService.findFirst({
          where: { professionalId: body.professionalId, serviceId: body.serviceId, active: true },
        });
        durationMinutes = ps?.customDurationMinutes ?? service.durationMinutes;
      } else {
        durationMinutes = service.durationMinutes;
      }
    }

    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    // Verifica conflito de horário
    if (body.professionalId) {
      const conflict = await prisma.appointment.findFirst({
        where: {
          barbershopId: ctx.barbershopId,
          professionalId: body.professionalId,
          status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
          AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: "Conflito de horario: o profissional ja tem agendamento neste intervalo." },
          { status: 409 },
        );
      }
    }

    // Cria ou recupera cliente
    let customerId: string | null = null;
    if (body.customerName?.trim()) {
      const existing = body.customerPhone
        ? await prisma.customer.findFirst({
            where: { barbershopId: ctx.barbershopId, phone: body.customerPhone.trim() },
          })
        : null;

      if (existing) {
        customerId = existing.id;
        // Atualiza último acesso
        await prisma.customer.update({
          where: { id: existing.id },
          data: { lastVisitAt: startsAt },
        });
      } else {
        const customer = await prisma.customer.create({
          data: {
            barbershopId: ctx.barbershopId,
            name: body.customerName.trim(),
            phone: body.customerPhone?.trim() ?? null,
            firstVisitAt: startsAt,
            lastVisitAt: startsAt,
          },
        });
        customerId = customer.id;
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        barbershopId: ctx.barbershopId,
        professionalId: body.professionalId ?? null,
        serviceId: body.serviceId ?? null,
        customerId,
        startsAt,
        endsAt,
        status: AppointmentStatus.SCHEDULED,
        source: body.source ?? "admin_panel",
        notes: body.notes?.trim() ?? null,
      },
      include: {
        professional: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar agendamento." }, { status: 503 });
  }
}
