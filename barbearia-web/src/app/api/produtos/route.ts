/**
 * GET  /api/produtos?q=&category=&active=&lowStock=1&expiring=30
 * POST /api/produtos
 *
 * Catalogo de produtos do estoque.
 * - Ver: OWNER, MANAGER, RECEPTION.
 * - Criar/editar/excluir: OWNER, MANAGER (ver [id]/route.ts).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  guardRole,
  MANAGER_ROLES,
  OPERATION_ROLES,
  resolveTenant,
} from "@/lib/auth-guard";

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStock: number;
  expiresAt: string | null;
  sellable: boolean;
  active: boolean;
  lowStock: boolean;
  expired: boolean;
  expiringSoon: boolean;
  stockValue: number;
};

export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = guardRole(ctx.role, OPERATION_ROLES);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const activeParam = searchParams.get("active");
  const lowStockOnly = searchParams.get("lowStock") === "1";
  const expiringDays = Number(searchParams.get("expiring") ?? 0);

  try {
    const products = await prisma.product.findMany({
      where: {
        barbershopId: ctx.barbershopId,
        ...(activeParam === null ? {} : { active: activeParam === "1" || activeParam === "true" }),
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    const now = Date.now();
    const soonCutoff = expiringDays > 0 ? now + expiringDays * 86400000 : now + 30 * 86400000;

    type DbProduct = {
      id: string; name: string; description: string | null; sku: string | null;
      category: string | null; unit: string; costPrice: unknown; salePrice: unknown;
      stockQuantity: number; minStock: number; expiresAt: Date | null;
      sellable: boolean; active: boolean;
    };

    let rows: ProductRow[] = (products as DbProduct[]).map((p) => {
      const cost = Number(p.costPrice);
      const expTime = p.expiresAt ? new Date(p.expiresAt).getTime() : null;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        sku: p.sku,
        category: p.category,
        unit: p.unit,
        costPrice: cost,
        salePrice: Number(p.salePrice),
        stockQuantity: p.stockQuantity,
        minStock: p.minStock,
        expiresAt: p.expiresAt ? new Date(p.expiresAt).toISOString() : null,
        sellable: p.sellable,
        active: p.active,
        lowStock: p.minStock > 0 && p.stockQuantity <= p.minStock,
        expired: expTime !== null && expTime < now,
        expiringSoon: expTime !== null && expTime >= now && expTime <= soonCutoff,
        stockValue: p.stockQuantity * cost,
      };
    });

    if (lowStockOnly) rows = rows.filter((r) => r.lowStock);

    return NextResponse.json({ products: rows });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar produtos." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      sku?: string;
      category?: string;
      unit?: string;
      costPrice?: number;
      salePrice?: number;
      minStock?: number;
      expiresAt?: string | null;
      sellable?: boolean;
      initialQuantity?: number;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome do produto e obrigatorio." }, { status: 400 });
    }
    if ((body.costPrice ?? 0) < 0 || (body.salePrice ?? 0) < 0 || (body.minStock ?? 0) < 0) {
      return NextResponse.json({ error: "Valores nao podem ser negativos." }, { status: 400 });
    }
    const initialQuantity = body.initialQuantity ?? 0;
    if (initialQuantity < 0 || !Number.isInteger(initialQuantity)) {
      return NextResponse.json({ error: "Quantidade inicial invalida." }, { status: 400 });
    }

    const sku = body.sku?.trim() || null;
    if (sku) {
      const dup = await prisma.product.findFirst({
        where: { barbershopId: ctx.barbershopId, sku },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json({ error: "Ja existe um produto com este SKU." }, { status: 409 });
      }
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: "Data de validade invalida." }, { status: 400 });
    }

    // Cria o produto e, se houver quantidade inicial, ja registra a entrada
    // como movimentacao (historico completo desde o dia zero).
    const product = await prisma.$transaction(async (tx: typeof db) => {
      const created = await tx.product.create({
        data: {
          barbershopId: ctx.barbershopId,
          name,
          description: body.description?.trim() || null,
          sku,
          category: body.category?.trim() || null,
          unit: body.unit?.trim() || "un",
          costPrice: body.costPrice ?? 0,
          salePrice: body.salePrice ?? 0,
          minStock: body.minStock ?? 0,
          expiresAt,
          sellable: body.sellable ?? true,
          stockQuantity: initialQuantity,
        },
      });

      if (initialQuantity > 0) {
        await tx.stockMovement.create({
          data: {
            barbershopId: ctx.barbershopId,
            productId: created.id,
            type: "PURCHASE",
            quantity: initialQuantity,
            balanceAfter: initialQuantity,
            unitCost: body.costPrice ?? 0,
            reason: "Saldo inicial do cadastro",
            createdById: ctx.userId,
          },
        });
      }

      return created;
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar produto." }, { status: 503 });
  }
}
