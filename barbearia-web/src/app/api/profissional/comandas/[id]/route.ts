/**
 * GET   /api/profissional/comandas/[id]
 * PATCH /api/profissional/comandas/[id]
 *   action: add_item | remove_item | discount | send_to_cashier | close
 *
 * SEPARACAO ENTRE ATENDIMENTO E PAGAMENTO (secao 6)
 * `send_to_cashier` marca a comanda como AWAITING_PAYMENT: o servico acabou,
 * o dinheiro nao entrou. Comissao NAO e gerada nesse momento — a secao 9,
 * regra 2 e explicita em considerar apenas valores pagos. Quem fecha e recebe
 * e o caixa (`/api/comandas/[id]`), ou o proprio barbeiro quando o gestor
 * liga `canReceivePayment`.
 *
 * Baixa de estoque, comissao e pagamento continuam concentrados na rota do
 * caixa: duplicar essa logica aqui seria a forma mais rapida de fazer os dois
 * caminhos divergirem.
 */

import { NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveProfessional } from "@/lib/professional-guard";
import { closeOrder } from "@/lib/close-order";
import { logAudit } from "@/lib/audit";

const ORDER_INCLUDE = {
  customer: { select: { id: true, name: true } },
  appointment: { select: { id: true, startsAt: true, status: true } },
  items: {
    select: {
      id: true,
      name: true,
      type: true,
      quantity: true,
      unitPrice: true,
      total: true,
      serviceId: true,
      productId: true,
    },
  },
  payments: { select: { id: true, method: true, amount: true, paidAt: true } },
} as const;

/** Recalcula subtotal e total a partir dos itens e do desconto gravado. */
async function recalc(orderId: string) {
  const [items, order] = await Promise.all([
    prisma.orderItem.findMany({ where: { orderId }, select: { total: true } }),
    prisma.order.findUnique({
      where: { id: orderId },
      select: { discountType: true, discountValue: true },
    }),
  ]);

  const subtotal = items.reduce((s, i) => s + Number(i.total), 0);

  let discount = 0;
  if (order?.discountType === "fixed") discount = Number(order.discountValue ?? 0);
  if (order?.discountType === "percent") {
    discount = subtotal * (Number(order.discountValue ?? 0) / 100);
  }

  const total = Math.max(0, subtotal - discount);

  return prisma.order.update({
    where: { id: orderId },
    data: { subtotal, total },
    include: ORDER_INCLUDE,
  });
}

function serialize(order: {
  subtotal: unknown;
  total: unknown;
  discountValue: unknown;
  items: { unitPrice: unknown; total: unknown }[];
  payments?: { amount: unknown }[];
}) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    discountValue: order.discountValue == null ? null : Number(order.discountValue),
    items: order.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      total: Number(i.total),
    })),
    ...(order.payments
      ? { payments: order.payments.map((p) => ({ ...p, amount: Number(p.amount) })) }
      : {}),
  };
}

/** Carrega a comanda garantindo tenant E dono. */
async function loadOwnOrder(orderId: string, barbershopId: string, professionalId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, barbershopId, professionalId },
    include: ORDER_INCLUDE,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const order = await loadOwnOrder(id, ctx.barbershopId, ctx.professionalId);
  if (!order) {
    return NextResponse.json({ error: "Comanda nao encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    order: serialize(order),
    permissions: {
      maxDiscountPercent: ctx.permissions.maxDiscountPercent,
      canReceivePayment: ctx.permissions.canReceivePayment,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  try {
    const order = await loadOwnOrder(id, ctx.barbershopId, ctx.professionalId);
    if (!order) {
      return NextResponse.json({ error: "Comanda nao encontrada." }, { status: 404 });
    }

    // Comanda paga nao volta atras pelo portal do barbeiro (secao 19, regra 9).
    if (order.status === "CLOSED" || order.status === "CANCELLED" || order.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Esta comanda ja foi fechada. Peca ao gestor para reabrir." },
        { status: 409 },
      );
    }

    const body = (await request.json()) as {
      action?: "add_item" | "remove_item" | "discount" | "send_to_cashier" | "close";
      serviceId?: string;
      productId?: string;
      quantity?: number;
      itemId?: string;
      discountType?: "fixed" | "percent";
      discountValue?: number;
      paymentMethod?: string;
    };

    // ── adicionar item ───────────────────────────────────────────────────────
    if (body.action === "add_item") {
      const quantity = body.quantity ?? 1;
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: "Quantidade deve ser um inteiro maior que zero." },
          { status: 400 },
        );
      }

      if (body.serviceId) {
        const service = await prisma.service.findFirst({
          where: { id: body.serviceId, barbershopId: ctx.barbershopId, active: true },
          select: { id: true, name: true, price: true },
        });
        if (!service) {
          return NextResponse.json({ error: "Servico nao encontrado." }, { status: 404 });
        }

        // Secao 6, regra 8: so servicos habilitados para este profissional.
        const link = await prisma.professionalService.findFirst({
          where: { professionalId: ctx.professionalId, serviceId: service.id, active: true },
          select: { customPrice: true },
        });
        if (!link) {
          return NextResponse.json(
            { error: "Este servico nao esta habilitado para voce." },
            { status: 403 },
          );
        }

        // Preco vem do catalogo — o barbeiro nao define preco (secao 18).
        const unitPrice = Number(link.customPrice ?? service.price);

        await prisma.orderItem.create({
          data: {
            orderId: id,
            type: "service",
            serviceId: service.id,
            name: service.name,
            quantity,
            unitPrice,
            total: unitPrice * quantity,
          },
        });
      } else if (body.productId) {
        const product = await prisma.product.findFirst({
          where: { id: body.productId, barbershopId: ctx.barbershopId },
        });
        if (!product) {
          return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
        }
        if (!product.active || !product.sellable) {
          return NextResponse.json(
            { error: "Produto indisponivel para venda." },
            { status: 400 },
          );
        }
        // Conferencia amigavel; a baixa real e revalidada no fechamento.
        if (product.stockQuantity < quantity) {
          return NextResponse.json(
            { error: `Estoque insuficiente: restam ${product.stockQuantity} un.` },
            { status: 409 },
          );
        }

        const unitPrice = Number(product.salePrice);
        await prisma.orderItem.create({
          data: {
            orderId: id,
            type: "product",
            productId: product.id,
            name: product.name,
            quantity,
            unitPrice,
            total: unitPrice * quantity,
          },
        });
      } else {
        return NextResponse.json(
          { error: "Informe um servico ou um produto." },
          { status: 400 },
        );
      }

      const updated = await recalc(id);

      await logAudit({
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        userName: ctx.userName,
        action: "order.add_item",
        entity: "Order",
        entityId: id,
        after: { serviceId: body.serviceId, productId: body.productId, quantity },
        request,
      });

      return NextResponse.json({ order: serialize(updated) });
    }

    // ── remover item ─────────────────────────────────────────────────────────
    if (body.action === "remove_item") {
      if (!body.itemId) {
        return NextResponse.json({ error: "Informe o item." }, { status: 400 });
      }
      // Escopo no orderId: impede remover item de comanda alheia.
      const removed = await prisma.orderItem.deleteMany({
        where: { id: body.itemId, orderId: id },
      });
      if (removed.count === 0) {
        return NextResponse.json(
          { error: "Item nao encontrado nesta comanda." },
          { status: 404 },
        );
      }

      const updated = await recalc(id);

      await logAudit({
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        userName: ctx.userName,
        action: "order.remove_item",
        entity: "Order",
        entityId: id,
        before: { itemId: body.itemId },
        request,
      });

      return NextResponse.json({ order: serialize(updated) });
    }

    // ── desconto, dentro do teto do profissional ────────────────────────────
    if (body.action === "discount") {
      const max = ctx.permissions.maxDiscountPercent;
      if (max <= 0) {
        return NextResponse.json(
          { error: "Voce nao tem permissao para aplicar desconto." },
          { status: 403 },
        );
      }

      const value = body.discountValue ?? 0;
      if (value < 0) {
        return NextResponse.json({ error: "Desconto invalido." }, { status: 400 });
      }
      if (body.discountType !== "fixed" && body.discountType !== "percent") {
        return NextResponse.json({ error: "Tipo de desconto invalido." }, { status: 400 });
      }

      const items = await prisma.orderItem.findMany({
        where: { orderId: id },
        select: { total: true },
      });
      const subtotal = items.reduce((s, i) => s + Number(i.total), 0);

      // O teto e sempre percentual, mesmo para desconto em reais — senao um
      // "R$ 50" numa comanda de R$ 60 furaria um limite de 10%.
      const asPercent =
        body.discountType === "percent" ? value : subtotal > 0 ? (value / subtotal) * 100 : 100;

      if (asPercent > max) {
        return NextResponse.json(
          { error: `Seu limite de desconto e ${max}%. Este desconto equivale a ${asPercent.toFixed(1)}%.` },
          { status: 403 },
        );
      }

      await prisma.order.update({
        where: { id },
        data: { discountType: body.discountType, discountValue: value },
      });
      const updated = await recalc(id);

      await logAudit({
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        userName: ctx.userName,
        action: "order.discount",
        entity: "Order",
        entityId: id,
        before: { discountType: order.discountType, discountValue: order.discountValue },
        after: { discountType: body.discountType, discountValue: value },
        request,
      });

      return NextResponse.json({ order: serialize(updated) });
    }

    // ── enviar para o caixa ─────────────────────────────────────────────────
    if (body.action === "send_to_cashier") {
      if (order.items.length === 0) {
        return NextResponse.json(
          { error: "Adicione ao menos um item antes de enviar para o caixa." },
          { status: 400 },
        );
      }
      if (order.status === "AWAITING_PAYMENT") {
        return NextResponse.json({ order: serialize(order), alreadySent: true });
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status: "AWAITING_PAYMENT" },
        include: ORDER_INCLUDE,
      });

      await logAudit({
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        userName: ctx.userName,
        action: "order.send_to_cashier",
        entity: "Order",
        entityId: id,
        before: { status: order.status },
        after: { status: "AWAITING_PAYMENT", total: Number(updated.total) },
        request,
      });

      return NextResponse.json({ order: serialize(updated) });
    }

    // ── fechar recebendo (so com permissao) ─────────────────────────────────
    if (body.action === "close") {
      if (!ctx.permissions.canReceivePayment) {
        return NextResponse.json(
          {
            error: "Voce nao recebe pagamento. Envie a comanda para o caixa.",
            code: "PERMISSION_DENIED",
          },
          { status: 403 },
        );
      }
      if (!body.paymentMethod || !(body.paymentMethod in PaymentMethod)) {
        return NextResponse.json(
          { error: "Informe uma forma de pagamento valida." },
          { status: 400 },
        );
      }

      // Delega ao caixa: baixa de estoque, pagamento e comissao ficam em um
      // lugar so. Repetir a logica aqui e como os dois caminhos divergem.
      const result = await closeOrder({
        orderId: id,
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        paymentMethod: body.paymentMethod as PaymentMethod,
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      await logAudit({
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        userName: ctx.userName,
        action: "order.close",
        entity: "Order",
        entityId: id,
        before: { status: order.status },
        after: { status: "CLOSED", method: body.paymentMethod, total: result.total },
        request,
      });

      return NextResponse.json({ order: serialize(result.order) });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch (error) {
    console.error("[profissional/comandas PATCH]", error);
    return NextResponse.json({ error: "Erro ao atualizar a comanda." }, { status: 503 });
  }
}
