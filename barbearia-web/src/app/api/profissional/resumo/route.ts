/**
 * GET /api/profissional/resumo?date=YYYY-MM-DD
 *
 * Resumo operacional do dia (secao 3). Responde, em uma chamada, as perguntas
 * que a tela inicial precisa: quem e o proximo cliente, quantos atendimentos
 * restam, quanto ja foi produzido e qual a comissao estimada.
 *
 * O dia civil vem do fuso da BARBEARIA (`dayRangeInTimeZone`), nao do relogio
 * do servidor — na Vercel o Node roda em UTC e a janela sairia deslocada em
 * tres horas.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { maskPhone, resolveProfessional } from "@/lib/professional-guard";
import {
  computeAvailableSlots,
  dayRangeInTimeZone,
  todayInTimeZone,
} from "@/lib/availability";

/** Estados que ainda ocupam a agenda (nao foram embora nem cancelaram). */
const ACTIVE_STATUSES = ["SCHEDULED", "CONFIRMED", "ARRIVED", "IN_PROGRESS"] as const;

export async function GET(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") ?? todayInTimeZone(ctx.timezone);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Data invalida." }, { status: 400 });
  }

  try {
    const { start, end } = dayRangeInTimeZone(dateStr, ctx.timezone);

    const [appointments, closedOrders, openOrders, commissions, workingHours, blocks] =
      await Promise.all([
        prisma.appointment.findMany({
          where: {
            barbershopId: ctx.barbershopId,
            professionalId: ctx.professionalId,
            startsAt: { gte: start, lt: end },
          },
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            service: { select: { id: true, name: true, durationMinutes: true, price: true } },
            order: { select: { id: true, status: true } },
          },
          orderBy: { startsAt: "asc" },
        }),
        // Producao do dia: apenas comandas efetivamente PAGAS (secao 9,
        // regra 2 — comissao considera valores pagos).
        prisma.order.findMany({
          where: {
            barbershopId: ctx.barbershopId,
            professionalId: ctx.professionalId,
            status: "CLOSED",
            closedAt: { gte: start, lt: end },
          },
          select: { id: true, total: true },
        }),
        prisma.order.findMany({
          where: {
            barbershopId: ctx.barbershopId,
            professionalId: ctx.professionalId,
            status: { in: ["OPEN", "AWAITING_PAYMENT"] },
          },
          select: { id: true, status: true, total: true, customer: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.commission.findMany({
          where: {
            barbershopId: ctx.barbershopId,
            professionalId: ctx.professionalId,
            createdAt: { gte: start, lt: end },
          },
          select: { commissionAmount: true, status: true },
        }),
        prisma.workingHours.findMany({
          where: { professionalId: ctx.professionalId },
        }),
        prisma.scheduleBlock.findMany({
          where: {
            barbershopId: ctx.barbershopId,
            OR: [{ professionalId: ctx.professionalId }, { professionalId: null }],
            startsAt: { lt: end },
            endsAt: { gt: start },
          },
          select: { startsAt: true, endsAt: true, reason: true, type: true },
        }),
      ]);

    const now = new Date();

    const active = appointments.filter((a) =>
      (ACTIVE_STATUSES as readonly string[]).includes(a.status),
    );

    // Proximo cliente: o atendimento em andamento tem prioridade; senao, o
    // proximo ativo que ainda nao passou.
    const inProgress = appointments.find((a) => a.status === "IN_PROGRESS") ?? null;
    const waiting = active.filter((a) => a.status === "ARRIVED");
    const upcoming = active
      .filter((a) => a.status !== "IN_PROGRESS" && a.endsAt > now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const next = inProgress ?? waiting[0] ?? upcoming[0] ?? null;

    // Horarios livres restantes: reaproveita o motor de disponibilidade com
    // uma duracao de referencia de 30 min, so para dar a nocao de "quanto
    // ainda cabe hoje".
    const busy = [
      ...active.map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt })),
      ...blocks.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
    ];
    const freeSlots = computeAvailableSlots({
      dateStr,
      timeZone: ctx.timezone,
      durationMinutes: 30,
      workingHours,
      busyIntervals: busy,
      minAdvanceMinutes: 0,
    });

    const production = closedOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const commissionTotal = commissions.reduce(
      (sum, c) => sum + Number(c.commissionAmount),
      0,
    );

    const serialize = (a: (typeof appointments)[number]) => ({
      id: a.id,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      notes: a.notes,
      source: a.source,
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
    });

    return NextResponse.json({
      date: dateStr,
      timezone: ctx.timezone,
      professional: { id: ctx.professionalId, name: ctx.professionalName },
      permissions: ctx.permissions,
      next: next ? serialize(next) : null,
      inProgress: inProgress ? serialize(inProgress) : null,
      waiting: waiting.map(serialize),
      appointments: appointments.map(serialize),
      openOrders: openOrders.map((o) => ({
        id: o.id,
        status: o.status,
        total: Number(o.total),
        customerName: o.customer?.name ?? null,
      })),
      blocks,
      summary: {
        total: appointments.length,
        completed: appointments.filter((a) => a.status === "COMPLETED").length,
        cancelled: appointments.filter((a) => a.status === "CANCELLED").length,
        noShow: appointments.filter((a) => a.status === "NO_SHOW").length,
        waiting: waiting.length,
        remaining: upcoming.length + (inProgress ? 1 : 0),
        freeSlots: freeSlots.length,
        production,
        commission: commissionTotal,
        // Deixa explicito que comissao do dia ainda nao esta fechada
        // (secao 10: "informar quando os dados ainda nao estiverem fechados").
        commissionIsEstimate: true,
      },
    });
  } catch (error) {
    console.error("[profissional/resumo]", error);
    return NextResponse.json({ error: "Erro ao carregar o resumo." }, { status: 503 });
  }
}
