/**
 * GET  /api/estoque/movimentacoes?productId=&type=&from=&to=&take=&skip=
 * POST /api/estoque/movimentacoes
 *
 * Historico e registro de entradas/saidas de estoque.
 * - Ver e movimentar: OWNER, MANAGER, RECEPTION.
 * - Venda (SALE) NAO passa por aqui: e gerada automaticamente ao fechar a comanda.
 * - Atualizacao do custo do produto a partir de uma compra: so OWNER/MANAGER.
 */

import { NextResponse } from "next/server";
import { Prisma, StockMovementType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  guardRole,
  MANAGER_ROLES,
  OPERATION_ROLES,
  resolveTenant,
} from "@/lib/auth-guard";

const IN_TYPES = ["PURCHASE", "RETURN", "ADJUSTMENT_IN"] as const;
const OUT_TYPES = ["CONSUMPTION", "LOSS", "ADJUSTMENT_OUT"] as const;
const ALL_TYPES = [...IN_TYPES, ...OUT_TYPES, "SALE"] as const;

export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = guardRole(ctx.role, OPERATION_ROLES);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const take = Math.min(Number(searchParams.get("take") ?? 100), 500);
  const skip = Number(searchParams.get("skip") ?? 0);

  try {
    // O `includes` acima confirma que o valor pertence ao enum, mas o
    // TypeScript não estreita `string` a partir de um `readonly string[]` —
    // por isso o cast explícito. Antes o `where` era `any` e isso passava sem
    // ninguém perceber.
    const typeFilter =
      type && (ALL_TYPES as readonly string[]).includes(type)
        ? (type as StockMovementType)
        : undefined;

    const where: Prisma.StockMovementWhereInput = {
      barbershopId: ctx.barbershopId,
      ...(productId ? { productId } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { select: { id: true, name: true, unit: true } } },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({ movements, total });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar movimentacoes." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = guardRole(ctx.role, OPERATION_ROLES);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      productId?: string;
      type?: string;
      quantity?: number;
      unitCost?: number;
      reason?: string;
      updateProductCost?: boolean;
    };

    if (!body.productId || !body.type) {
      return NextResponse.json({ error: "productId e type sao obrigatorios." }, { status: 400 });
    }

    if (body.type === "SALE") {
      return NextResponse.json(
        { error: "Vendas sao registradas automaticamente pela comanda." },
        { status: 400 },
      );
    }

    const isIn = (IN_TYPES as readonly string[]).includes(body.type);
    const isOut = (OUT_TYPES as readonly string[]).includes(body.type);
    if (!isIn && !isOut) {
      return NextResponse.json({ error: "Tipo de movimentacao invalido." }, { status: 400 });
    }

    const qty = body.quantity ?? 0;
    if (!Number.isInteger(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "quantity deve ser um inteiro maior que zero." },
        { status: 400 },
      );
    }

    if (body.unitCost != null && body.unitCost < 0) {
      return NextResponse.json({ error: "Custo unitario invalido." }, { status: 400 });
    }

    const signedQty = isIn ? qty : -qty;

    // Transacao serializavel: atualiza saldo + grava historico de forma atomica,
    // sem permitir saldo negativo mesmo com requisicoes simultaneas.
    let result;
    try {
      result = await prisma.$transaction(
        // Tipo do `tx` inferido pelo Prisma — antes era `typeof db`, que
        // apontava para o cast `any` removido no B2.
        async (tx) => {
          const product = await tx.product.findFirst({
            where: { id: body.productId, barbershopId: ctx.barbershopId },
          });
          if (!product) throw new Error("NOT_FOUND");

          const newBalance = product.stockQuantity + signedQty;
          if (newBalance < 0) throw new Error("INSUFFICIENT");

          // Custo do produto so muda se um gestor pedir explicitamente.
          const shouldUpdateCost =
            isIn &&
            body.unitCost != null &&
            body.updateProductCost === true &&
            MANAGER_ROLES.includes(ctx.role);

          const updated = await tx.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: newBalance,
              ...(shouldUpdateCost ? { costPrice: body.unitCost } : {}),
            },
          });

          const movement = await tx.stockMovement.create({
            data: {
              barbershopId: ctx.barbershopId,
              productId: product.id,
              // As validações acima (`isIn`/`isOut`) já garantiram que o valor
              // está no enum; o cast só informa isso ao compilador.
              type: body.type as StockMovementType,
              quantity: signedQty,
              balanceAfter: newBalance,
              unitCost: body.unitCost ?? (isOut ? Number(product.costPrice) : null),
              reason: body.reason?.trim() || null,
              createdById: ctx.userId,
            },
            include: { product: { select: { id: true, name: true, unit: true } } },
          });

          return { movement, product: updated };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
      }
      if (err instanceof Error && err.message === "INSUFFICIENT") {
        return NextResponse.json(
          { error: "Saldo insuficiente para esta saida." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Nao foi possivel registrar. Tente novamente." },
        { status: 409 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao registrar movimentacao." }, { status: 503 });
  }
}
