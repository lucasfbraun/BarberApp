/**
 * POST   /api/cliente/carrinho/produtos  { slug, productId, quantity }
 * DELETE /api/cliente/carrinho/produtos?itemId=&slug=
 *
 * Produto no carrinho = item numa comanda OPEN do cliente (encomenda).
 * Nada e cobrado online: o cliente paga na barbearia, que fecha a comanda
 * (momento em que ocorre a baixa de estoque, ja implementada).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCustomer } from "@/lib/auth-guard";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";

// Cast temporario ate o Prisma Client local ser regenerado (B2).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

async function findBarbershop(slug: string) {
  return prisma.barbershop.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true },
  });
}

export async function POST(request: Request) {
  if (isRateLimited(`carrinho-add:${getClientIp(request)}`, { limit: 30, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const ctx = await resolveCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { slug?: string; productId?: string; quantity?: number };
    const quantity = body.quantity ?? 1;

    if (!body.slug || !body.productId) {
      return NextResponse.json({ error: "slug e productId sao obrigatorios." }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantidade invalida." }, { status: 400 });
    }

    const barbershop = await findBarbershop(body.slug);
    if (!barbershop) {
      return NextResponse.json({ error: "Barbearia nao encontrada." }, { status: 404 });
    }

    const product = await db.product.findFirst({
      where: { id: body.productId, barbershopId: barbershop.id, active: true, sellable: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Produto indisponivel." }, { status: 404 });
    }
    if (product.stockQuantity < quantity) {
      return NextResponse.json(
        { error: `Estoque insuficiente: restam ${product.stockQuantity} un.` },
        { status: 409 },
      );
    }

    // Garante o registro Customer do usuario nesta barbearia.
    let customer = await db.customer.findFirst({
      where: { barbershopId: barbershop.id, userId: ctx.userId },
    });
    if (!customer) {
      customer = await db.customer.create({
        data: {
          barbershopId: barbershop.id,
          userId: ctx.userId,
          name: ctx.name,
          phone: ctx.phone,
          email: ctx.email,
        },
      });
    }

    // Encomenda OPEN do cliente (cria se nao existir).
    let order = await db.order.findFirst({
      where: {
        barbershopId: barbershop.id,
        status: "OPEN",
        appointmentId: null,
        customerId: customer.id,
      },
      include: { items: true },
    });
    if (!order) {
      order = await db.order.create({
        data: {
          barbershopId: barbershop.id,
          customerId: customer.id,
          status: "OPEN",
          subtotal: 0,
          total: 0,
        },
        include: { items: true },
      });
    }

    // Mesmo produto ja no carrinho: soma a quantidade (revalida saldo).
    type Item = { id: string; productId: string | null; quantity: number; unitPrice: unknown };
    const existing = (order.items as Item[]).find((i) => i.productId === product.id);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.stockQuantity < newQty) {
        return NextResponse.json(
          { error: `Estoque insuficiente: restam ${product.stockQuantity} un.` },
          { status: 409 },
        );
      }
      await db.orderItem.update({
        where: { id: existing.id },
        data: { quantity: newQty, total: Number(existing.unitPrice) * newQty },
      });
    } else {
      await db.orderItem.create({
        data: {
          orderId: order.id,
          type: "product",
          productId: product.id,
          name: product.name,
          quantity,
          unitPrice: product.salePrice,
          total: Number(product.salePrice) * quantity,
        },
      });
    }

    // Recalcula totais da encomenda.
    const items = await db.orderItem.findMany({ where: { orderId: order.id } });
    const subtotal = (items as { total: unknown }[]).reduce((s, i) => s + Number(i.total), 0);
    await db.order.update({ where: { id: order.id }, data: { subtotal, total: subtotal } });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao adicionar ao carrinho." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const ctx = await resolveCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId e obrigatorio." }, { status: 400 });
  }

  try {
    // So remove item de encomenda OPEN do proprio cliente.
    const item = await db.orderItem.findFirst({
      where: {
        id: itemId,
        order: {
          status: "OPEN",
          appointmentId: null,
          customer: { userId: ctx.userId },
        },
      },
      select: { id: true, orderId: true },
    });
    if (!item) {
      return NextResponse.json({ error: "Item nao encontrado no carrinho." }, { status: 404 });
    }

    await db.orderItem.delete({ where: { id: item.id } });

    const items = await db.orderItem.findMany({ where: { orderId: item.orderId } });
    if (items.length === 0) {
      // Carrinho vazio: remove a encomenda para nao poluir o painel da barbearia.
      await db.order.delete({ where: { id: item.orderId } });
    } else {
      const subtotal = (items as { total: unknown }[]).reduce((s, i) => s + Number(i.total), 0);
      await db.order.update({ where: { id: item.orderId }, data: { subtotal, total: subtotal } });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao remover do carrinho." }, { status: 503 });
  }
}
