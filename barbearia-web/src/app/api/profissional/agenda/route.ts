/**
 * GET /api/profissional/agenda?date=YYYY-MM-DD&view=dia|semana&professionalId=
 *
 * Agenda do profissional (secao 4). Sempre a PROPRIA agenda; olhar a agenda de
 * um colega exige a permissao `canViewOthersAgenda` e, mesmo assim, e somente
 * leitura e sem dado do cliente — o colega nao precisa ver quem e o cliente do
 * outro, so onde ha horario ocupado.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { maskPhone, resolveProfessional } from "@/lib/professional-guard";
import {
  dayRangeInTimeZone,
  todayInTimeZone,
  weekRangeInTimeZone,
} from "@/lib/availability";

export async function GET(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") ?? todayInTimeZone(ctx.timezone);
  const view = searchParams.get("view") === "semana" ? "semana" : "dia";
  const requestedProfessionalId = searchParams.get("professionalId");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Data invalida." }, { status: 400 });
  }

  // Agenda de colega: so com permissao, e o resultado sai anonimizado.
  let professionalId = ctx.professionalId;
  let isOwnAgenda = true;

  if (requestedProfessionalId && requestedProfessionalId !== ctx.professionalId) {
    if (!ctx.permissions.canViewOthersAgenda) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para ver a agenda de outros profissionais." },
        { status: 403 },
      );
    }
    const colleague = await prisma.professional.findFirst({
      where: { id: requestedProfessionalId, barbershopId: ctx.barbershopId },
      select: { id: true },
    });
    if (!colleague) {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }
    professionalId = colleague.id;
    isOwnAgenda = false;
  }

  try {
    const range =
      view === "semana"
        ? weekRangeInTimeZone(dateStr, ctx.timezone)
        : (() => {
            const { start, end } = dayRangeInTimeZone(dateStr, ctx.timezone);
            return { days: [dateStr], start, end };
          })();

    const [appointments, blocks, workingHours] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          barbershopId: ctx.barbershopId,
          professionalId,
          startsAt: { gte: range.start, lt: range.end },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true, durationMinutes: true, price: true } },
          order: { select: { id: true, status: true } },
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.scheduleBlock.findMany({
        where: {
          barbershopId: ctx.barbershopId,
          OR: [{ professionalId }, { professionalId: null }],
          startsAt: { lt: range.end },
          endsAt: { gt: range.start },
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.workingHours.findMany({
        where: { professionalId },
        orderBy: { weekday: "asc" },
      }),
    ]);

    const items = appointments.map((a) => {
      // Agenda de colega: mostra apenas o bloco ocupado (secao 7 — o
      // profissional ve so os dados necessarios).
      if (!isOwnAgenda) {
        return {
          id: a.id,
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          status: a.status,
          busy: true,
          customer: null,
          service: null,
          notes: null,
          source: null,
          orderId: null,
          orderStatus: null,
        };
      }

      return {
        id: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        busy: true,
        notes: a.notes,
        source: a.source,
        cancellationReason: a.cancellationReason,
        rescheduledFrom: a.rescheduledFrom,
        customer: a.customer
          ? {
              id: a.customer.id,
              name: a.customer.name,
              phone: maskPhone(a.customer.phone, ctx.permissions.canViewCustomerPhone),
            }
          : null,
        service: a.service
          ? {
              id: a.service.id,
              name: a.service.name,
              durationMinutes: a.service.durationMinutes,
              price: Number(a.service.price),
            }
          : null,
        orderId: a.order?.id ?? null,
        orderStatus: a.order?.status ?? null,
      };
    });

    return NextResponse.json({
      view,
      date: dateStr,
      days: range.days,
      timezone: ctx.timezone,
      isOwnAgenda,
      permissions: ctx.permissions,
      appointments: items,
      blocks,
      workingHours,
    });
  } catch (error) {
    console.error("[profissional/agenda]", error);
    return NextResponse.json({ error: "Erro ao carregar a agenda." }, { status: 503 });
  }
}
