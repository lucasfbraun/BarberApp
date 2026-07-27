/**
 * GET /api/profissional/comissoes?period=hoje|semana|mes|mes_anterior&from=&to=
 *
 * Comissoes do PROPRIO profissional (secao 9). Nunca as de colegas — o filtro
 * por `professionalId` do contexto e a unica forma de chegar aos dados, entao
 * nao ha parametro que permita trocar de profissional.
 *
 * A comissao so existe depois que a comanda e paga: `Commission` e criada no
 * fechamento (`lib/close-order.ts`). Por isso a tela distingue o que ja virou
 * comissao do que ainda esta em comanda aberta ou aguardando pagamento —
 * secao 10: "informar quando os dados ainda nao estiverem fechados".
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveProfessional } from "@/lib/professional-guard";
import { dayRangeInTimeZone, todayInTimeZone, addDays } from "@/lib/availability";

type Period = "hoje" | "semana" | "mes" | "mes_anterior" | "personalizado";

/** Resolve o periodo pedido em instantes absolutos, no fuso da barbearia. */
function resolveRange(
  period: Period,
  timeZone: string,
  fromParam: string | null,
  toParam: string | null,
): { start: Date; end: Date; label: string } {
  const today = todayInTimeZone(timeZone);
  const [year, month] = today.split("-").map(Number);

  if (period === "personalizado" && fromParam && toParam) {
    return {
      start: dayRangeInTimeZone(fromParam, timeZone).start,
      end: dayRangeInTimeZone(toParam, timeZone).end,
      label: `${fromParam} a ${toParam}`,
    };
  }

  if (period === "hoje") {
    const { start, end } = dayRangeInTimeZone(today, timeZone);
    return { start, end, label: "Hoje" };
  }

  if (period === "semana") {
    // Semana corrente comecando no domingo, igual a convencao de WorkingHours.
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const first = addDays(today, -weekday);
    return {
      start: dayRangeInTimeZone(first, timeZone).start,
      end: dayRangeInTimeZone(addDays(first, 6), timeZone).end,
      label: "Esta semana",
    };
  }

  if (period === "mes_anterior") {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const firstDay = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).toISOString().slice(0, 10);
    return {
      start: dayRangeInTimeZone(firstDay, timeZone).start,
      end: dayRangeInTimeZone(lastDay, timeZone).end,
      label: "Mes anterior",
    };
  }

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return {
    start: dayRangeInTimeZone(firstDay, timeZone).start,
    end: dayRangeInTimeZone(lastDay, timeZone).end,
    label: "Este mes",
  };
}

export async function GET(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const periodParam = (searchParams.get("period") ?? "mes") as Period;
  const period: Period = [
    "hoje",
    "semana",
    "mes",
    "mes_anterior",
    "personalizado",
  ].includes(periodParam)
    ? periodParam
    : "mes";

  const { start, end, label } = resolveRange(
    period,
    ctx.timezone,
    searchParams.get("from"),
    searchParams.get("to"),
  );

  try {
    const [commissions, pendingOrders] = await Promise.all([
      prisma.commission.findMany({
        where: {
          barbershopId: ctx.barbershopId,
          professionalId: ctx.professionalId,
          createdAt: { gte: start, lt: end },
        },
        select: {
          id: true,
          grossAmount: true,
          commissionType: true,
          commissionRate: true,
          commissionAmount: true,
          status: true,
          paidAt: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              closedAt: true,
              customer: { select: { name: true } },
              items: { select: { name: true, type: true, total: true, quantity: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Ainda nao viraram comissao: servico feito, dinheiro nao recebido.
      prisma.order.findMany({
        where: {
          barbershopId: ctx.barbershopId,
          professionalId: ctx.professionalId,
          status: { in: ["OPEN", "AWAITING_PAYMENT"] },
        },
        select: {
          id: true,
          status: true,
          total: true,
          customer: { select: { name: true } },
        },
      }),
    ]);

    const byStatus = commissions.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + Number(c.commissionAmount);
      return acc;
    }, {});

    // Separacao servico x produto: a secao 9 pede o detalhamento, e as duas
    // bases podem ter percentuais diferentes no futuro.
    let serviceBase = 0;
    let productBase = 0;
    for (const c of commissions) {
      for (const item of c.order?.items ?? []) {
        if (item.type === "product") productBase += Number(item.total);
        else serviceBase += Number(item.total);
      }
    }

    const grossTotal = commissions.reduce((s, c) => s + Number(c.grossAmount), 0);
    const commissionTotal = commissions.reduce((s, c) => s + Number(c.commissionAmount), 0);
    const pendingTotal = pendingOrders.reduce((s, o) => s + Number(o.total), 0);

    return NextResponse.json({
      period,
      label,
      range: { start, end },
      summary: {
        grossProduction: grossTotal,
        commissionTotal,
        serviceBase,
        productBase,
        byStatus,
        appointmentsPaid: commissions.length,
        averageTicket: commissions.length > 0 ? grossTotal / commissions.length : 0,
      },
      /** Producao ja realizada que ainda nao virou comissao. */
      notYetCounted: {
        total: pendingTotal,
        orders: pendingOrders.map((o) => ({
          id: o.id,
          status: o.status,
          total: Number(o.total),
          customerName: o.customer?.name ?? null,
        })),
      },
      items: commissions.map((c) => ({
        id: c.id,
        createdAt: c.createdAt,
        status: c.status,
        paidAt: c.paidAt,
        grossAmount: Number(c.grossAmount),
        commissionType: c.commissionType,
        commissionRate: Number(c.commissionRate),
        commissionAmount: Number(c.commissionAmount),
        customerName: c.order?.customer?.name ?? null,
        closedAt: c.order?.closedAt ?? null,
        items: (c.order?.items ?? []).map((i) => ({
          name: i.name,
          type: i.type,
          quantity: i.quantity,
          total: Number(i.total),
        })),
      })),
    });
  } catch (error) {
    console.error("[profissional/comissoes]", error);
    return NextResponse.json({ error: "Erro ao carregar comissoes." }, { status: 503 });
  }
}
