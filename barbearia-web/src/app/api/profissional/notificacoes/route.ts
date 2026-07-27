/**
 * GET /api/profissional/notificacoes?since=ISO
 *
 * Notificacoes de agenda (secao 11, item do MVP "notificacoes de agendamento").
 *
 * DECISAO DE ESCOPO — leia antes de mudar
 * Nao ha push, WebSocket nem fila. As notificacoes sao DERIVADAS do estado
 * atual: agendamentos criados, alterados ou cancelados na agenda do
 * profissional desde `since`. A tela consulta esta rota periodicamente.
 *
 * O motivo e honestidade de infraestrutura: push real exige service worker com
 * Web Push, chaves VAPID e um servico de entrega — nada disso existe no
 * projeto hoje, e uma notificacao que nao chega e pior do que nenhuma. Derivar
 * do banco entrega o valor do MVP (o barbeiro ve que algo mudou) sem prometer
 * tempo real. Push verdadeiro esta registrado como fase 2.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveProfessional } from "@/lib/professional-guard";

type Notification = {
  id: string;
  type: "created" | "cancelled" | "rescheduled" | "arrived" | "review";
  title: string;
  detail: string;
  at: Date;
  appointmentId?: string;
};

function timeLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function GET(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 24 * 60 * 60_000);

  if (isNaN(since.getTime())) {
    return NextResponse.json({ error: "Parametro 'since' invalido." }, { status: 400 });
  }

  try {
    const [changed, reviews] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          barbershopId: ctx.barbershopId,
          professionalId: ctx.professionalId,
          updatedAt: { gte: since },
        },
        select: {
          id: true,
          status: true,
          startsAt: true,
          createdAt: true,
          updatedAt: true,
          cancelledAt: true,
          arrivedAt: true,
          rescheduledFrom: true,
          cancellationReason: true,
          customer: { select: { name: true } },
          service: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.review.findMany({
        where: {
          barbershopId: ctx.barbershopId,
          professionalId: ctx.professionalId,
          createdAt: { gte: since },
        },
        select: { id: true, rating: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const notifications: Notification[] = [];

    for (const a of changed) {
      const who = a.customer?.name ?? "Cliente";
      const what = a.service?.name ?? "atendimento";
      const when = timeLabel(a.startsAt, ctx.timezone);

      if (a.status === "CANCELLED") {
        notifications.push({
          id: `cancel-${a.id}`,
          type: "cancelled",
          title: "Atendimento cancelado",
          detail: `${who} — ${what}, ${when}${a.cancellationReason ? ` · ${a.cancellationReason}` : ""}`,
          at: a.cancelledAt ?? a.updatedAt,
          appointmentId: a.id,
        });
        continue;
      }

      if (a.status === "ARRIVED") {
        notifications.push({
          id: `arrived-${a.id}`,
          type: "arrived",
          title: "Cliente chegou",
          detail: `${who} esta aguardando — ${what}`,
          at: a.arrivedAt ?? a.updatedAt,
          appointmentId: a.id,
        });
        continue;
      }

      if (a.rescheduledFrom && a.rescheduledFrom.getTime() !== a.startsAt.getTime()) {
        notifications.push({
          id: `resched-${a.id}`,
          type: "rescheduled",
          title: "Atendimento remarcado",
          detail: `${who} — de ${timeLabel(a.rescheduledFrom, ctx.timezone)} para ${when}`,
          at: a.updatedAt,
          appointmentId: a.id,
        });
        continue;
      }

      // Criado no periodo (a diferenca de 1s absorve o lag entre os dois
      // carimbos gravados na mesma escrita).
      if (a.createdAt >= since && Math.abs(+a.updatedAt - +a.createdAt) < 1000) {
        notifications.push({
          id: `new-${a.id}`,
          type: "created",
          title: "Novo agendamento",
          detail: `${who} — ${what}, ${when}`,
          at: a.createdAt,
          appointmentId: a.id,
        });
      }
    }

    for (const r of reviews) {
      notifications.push({
        id: `review-${r.id}`,
        type: "review",
        title: "Nova avaliacao",
        detail: `${r.rating} de 5 estrelas`,
        at: r.createdAt,
      });
    }

    notifications.sort((a, b) => b.at.getTime() - a.at.getTime());

    return NextResponse.json({
      notifications: notifications.slice(0, 30),
      count: notifications.length,
      // O cliente usa como `since` da proxima chamada.
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[profissional/notificacoes]", error);
    return NextResponse.json({ error: "Erro ao carregar notificacoes." }, { status: 503 });
  }
}
