/**
 * GET /api/estoque/resumo?from=&to=
 *
 * Painel do estoque: inventario, alertas e lucro de vendas no periodo.
 * - Ver: OWNER, MANAGER, RECEPTION.
 * - Periodo padrao do lucro: ultimos 30 dias.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole, OPERATION_ROLES, resolveTenant } from "@/lib/auth-guard";

// Cast temporario ate o Prisma Client ser regenerado com os modelos de estoque (B2).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = guardRole(ctx.role, OPERATION_ROLES);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(Date.now() - 30 * 86400000);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  try {
    const now = new Date();
    const in30days = new Date(Date.now() + 30 * 86400000);

    type DbProduct = {
      id: string; name: string; unit: string; stockQuantity: number; minStock: number;
      costPrice: unknown; salePrice: unknown; expiresAt: Date | null;
    };
    type DbSale = {
      productId: string; quantity: number; unitCost: unknown; unitPrice: unknown;
      product: { id: string; name: string };
    };

    const [products, sales] = await Promise.all([
      db.product.findMany({
        where: { barbershopId: ctx.barbershopId, active: true },
        select: {
          id: true, name: true, unit: true, stockQuantity: true, minStock: true,
          costPrice: true, salePrice: true, expiresAt: true,
        },
      }) as Promise<DbProduct[]>,
      db.stockMovement.findMany({
        where: {
          barbershopId: ctx.barbershopId,
          type: "SALE",
          createdAt: { gte: from, lte: to },
        },
        include: { product: { select: { id: true, name: true } } },
      }) as Promise<DbSale[]>,
    ]);

    // Inventario
    let stockValue = 0;       // saldo * custo
    let potentialValue = 0;   // saldo * preco de venda
    const lowStock: { id: string; name: string; stockQuantity: number; minStock: number; unit: string }[] = [];
    const expired: { id: string; name: string; expiresAt: Date; stockQuantity: number }[] = [];
    const expiringSoon: { id: string; name: string; expiresAt: Date; stockQuantity: number }[] = [];

    for (const p of products) {
      stockValue += p.stockQuantity * Number(p.costPrice);
      potentialValue += p.stockQuantity * Number(p.salePrice);
      if (p.minStock > 0 && p.stockQuantity <= p.minStock) {
        lowStock.push({ id: p.id, name: p.name, stockQuantity: p.stockQuantity, minStock: p.minStock, unit: p.unit });
      }
      if (p.expiresAt) {
        const exp = new Date(p.expiresAt);
        if (exp < now) expired.push({ id: p.id, name: p.name, expiresAt: exp, stockQuantity: p.stockQuantity });
        else if (exp <= in30days) expiringSoon.push({ id: p.id, name: p.name, expiresAt: exp, stockQuantity: p.stockQuantity });
      }
    }

    // Lucro por produto no periodo (a partir dos movimentos SALE,
    // que congelam custo e preco praticados no momento da venda).
    const byProduct = new Map<string, {
      productId: string; name: string; quantitySold: number;
      revenue: number; cost: number; profit: number;
    }>();

    let totalRevenue = 0;
    let totalCost = 0;

    for (const s of sales) {
      const qty = Math.abs(s.quantity);
      const revenue = qty * Number(s.unitPrice ?? 0);
      const cost = qty * Number(s.unitCost ?? 0);
      totalRevenue += revenue;
      totalCost += cost;

      const entry = byProduct.get(s.productId) ?? {
        productId: s.productId, name: s.product.name,
        quantitySold: 0, revenue: 0, cost: 0, profit: 0,
      };
      entry.quantitySold += qty;
      entry.revenue += revenue;
      entry.cost += cost;
      entry.profit = entry.revenue - entry.cost;
      byProduct.set(s.productId, entry);
    }

    const profitByProduct = [...byProduct.values()].sort((a, b) => b.profit - a.profit);

    return NextResponse.json({
      inventory: {
        totalProducts: products.length,
        stockValue,
        potentialValue,
        lowStockCount: lowStock.length,
        expiredCount: expired.length,
        expiringSoonCount: expiringSoon.length,
        lowStock: lowStock.sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 20),
        expired: expired.slice(0, 20),
        expiringSoon: expiringSoon.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime()).slice(0, 20),
      },
      sales: {
        from, to,
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        byProduct: profitByProduct,
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar resumo do estoque." }, { status: 503 });
  }
}
