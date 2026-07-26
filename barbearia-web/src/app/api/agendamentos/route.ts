/**
 * GET  /api/agendamentos?date=YYYY-MM-DD&professionalId=
 * POST /api/agendamentos
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus, UserRole } from "@prisma/client";
import { resolveTenant } from "@/lib/auth-guard";

// GET — lista agendamentos do dia (com filtro opcional por profissional)
export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  let professionalId = searchParams.get("professionalId") ?? undefined;

  if (!dateStr) {
    return NextResponse.json({ error: "Parametro 'date' e obrigatorio." }, { status: 400 });
  }

  // PROFESSIONAL ve somente a propria agenda (escopo M2).
  if (ctx.role === UserRole.PROFESSIONAL) {
    const own = await prisma.professional.findFirst({
      where: { barbershopId: ctx.barbershopId, userId: ctx.userId },
      select: { id: true },
    });
    if (!own) {
      return NextResponse.json({ error: "Profissional nao vinculado ao usuario." }, { status: 403 });
    }
    professionalId = own.id;
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

    // M5: nao permitir agendamento no passado.
    if (startsAt < new Date()) {
      return NextResponse.json({ error: "Nao e possivel agendar no passado." }, { status: 400 });
    }

    // M5: profissional precisa pertencer ao tenant.
    if (body.professionalId) {
      const professional = await prisma.professional.findFirst({
        where: { id: body.professionalId, barbershopId: ctx.barbershopId, active: true },
        select: { id: true },
      });
      if (!professional) {
        return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
      }
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
        // M5: exigir vinculo ativo profissional<->servico.
        const ps = await prisma.professionalService.findFirst({
          where: { professionalId: body.professionalId, serviceId: body.serviceId, active: true },
        });
        if (!ps) {
          return NextResponse.json(
            { error: "Este profissional nao realiza o servico selecionado." },
            { status: 400 },
          );
        }
        durationMinutes = ps.customDurationMinutes ?? service.durationMinutes;
      } else {
        durationMinutes = service.durationMinutes;
      }
    }

    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

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

    // M1: checagem de conflito e criacao na MESMA transacao serializavel,
    // eliminando a corrida de duplo agendamento (TOCTOU).
    let appointment;
    try {
      appointment = await prisma.$transaction(
        async (tx) => {
          if (body.professionalId) {
            const conflict = await tx.appointment.findFirst({
              where: {
                barbershopId: ctx.barbershopId,
                professionalId: body.professionalId,
                status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
                AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
              },
            });
            if (conflict) throw new Error("CONFLICT");
          }

          return tx.appointment.create({
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
        },
        { isolationLevel: "Serializable" },
      );
    } catch (err) {
      if (err instanceof Error && err.message === "CONFLICT") {
        return NextResponse.json(
          { error: "Conflito de horario: o profissional ja tem agendamento neste intervalo." },
          { status: 409 },
        );
      }
      // Falha de serializacao (corrida) tambem vira conflito para o cliente.
      return NextResponse.json(
        { error: "Nao foi possivel reservar este horario. Tente novamente." },
        { status: 409 },
      );
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar agendamento." }, { status: 503 });
  }
}
