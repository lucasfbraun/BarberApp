/**
 * GET /api/profissional/avaliacoes
 *
 * Avaliacoes recebidas pelo profissional (secao 15). Somente leitura: a
 * secao 15 e explicita em que o profissional NAO pode apagar avaliacao, e a
 * moderacao e do administrador. Responder avaliacao depende de um campo de
 * resposta que o modelo `Review` ainda nao tem — registrado como fase 2.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveProfessional } from "@/lib/professional-guard";

export async function GET(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("take") ?? 50), 100);

  try {
    const [reviews, stats] = await Promise.all([
      prisma.review.findMany({
        where: { barbershopId: ctx.barbershopId, professionalId: ctx.professionalId },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          customer: { select: { name: true } },
          appointment: {
            select: { startsAt: true, service: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take,
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { barbershopId: ctx.barbershopId, professionalId: ctx.professionalId },
        _count: { _all: true },
      }),
    ]);

    // Distribuicao de 1 a 5, sempre com as cinco faixas presentes — a barra
    // do grafico nao pode sumir so porque ninguem deu 2 estrelas.
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const row of stats) {
      const count = row._count._all;
      distribution[row.rating] = count;
      total += count;
      sum += row.rating * count;
    }

    return NextResponse.json({
      average: total > 0 ? sum / total : null,
      total,
      distribution,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        // Primeiro nome apenas: a avaliacao e sobre o servico, nao um dossie
        // do cliente (secao 7 — so o dado necessario).
        customerName: r.customer?.name?.split(" ")[0] ?? "Cliente",
        serviceName: r.appointment?.service?.name ?? null,
        appointmentAt: r.appointment?.startsAt ?? null,
      })),
    });
  } catch (error) {
    console.error("[profissional/avaliacoes]", error);
    return NextResponse.json({ error: "Erro ao carregar avaliacoes." }, { status: 503 });
  }
}
