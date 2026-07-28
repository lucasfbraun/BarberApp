/**
 * GET /api/admin/revendedores?q=&status=
 * Lista de revendedores com receita e comissao acumuladas. Restrito a SUPERADMIN.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";

/** Status aceitos no filtro. Evita mandar string arbitraria para o banco. */
const STATUSES = ["PENDING", "ACTIVE", "INACTIVE"] as const;

export async function GET(request: Request) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const filter = url.searchParams.get("status") ?? "all";
  const statusFilter = (STATUSES as readonly string[]).includes(filter.toUpperCase())
    ? filter.toUpperCase()
    : null;

  try {
    // Busca e status agora combinam no MESMO where. Antes eram excludentes
    // (um ternario escolhia so um) e o status era reaplicado em memoria
    // depois — o que dava contagem certa e lista errada quando os dois vinham
    // juntos.
    const where: Prisma.ResellerWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { couponCode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const resellers = await prisma.reseller.findMany({
      where,
      include: {
        referrals: {
          include: { barbershop: { select: { id: true, name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Receita de TODAS as barbearias indicadas em uma consulta agrupada, em
    // vez de uma consulta por revendedor (o padrao N+1 de antes).
    const allBarbershopIds = resellers.flatMap((r) =>
      r.referrals.map((ref) => ref.barbershopId),
    );

    const revenueByBarbershop = new Map<string, number>();
    if (allBarbershopIds.length > 0) {
      const grouped = await prisma.order.groupBy({
        by: ["barbershopId"],
        where: { barbershopId: { in: allBarbershopIds }, status: "CLOSED" },
        _sum: { total: true },
      });
      for (const row of grouped) {
        revenueByBarbershop.set(row.barbershopId, Number(row._sum.total ?? 0));
      }
    }

    const enriched = resellers.map((r) => {
      const totalRevenue = r.referrals.reduce(
        (sum, ref) => sum + (revenueByBarbershop.get(ref.barbershopId) ?? 0),
        0,
      );
      return {
        ...r,
        totalRevenue,
        totalCommission: totalRevenue * (r.commissionRate / 100),
      };
    });

    // O resumo conta o universo inteiro, nao o resultado filtrado — senao os
    // cartoes de "pendentes" e "ativos" mudariam a cada busca.
    const counts = await prisma.reseller.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

    return NextResponse.json({
      summary: {
        total: counts.reduce((s, c) => s + c._count._all, 0),
        active: byStatus.ACTIVE ?? 0,
        pending: byStatus.PENDING ?? 0,
        inactive: byStatus.INACTIVE ?? 0,
      },
      resellers: enriched,
    });
  } catch (error) {
    console.error("[admin/revendedores]", error);
    return NextResponse.json({ error: "Erro ao carregar revendedores." }, { status: 503 });
  }
}
