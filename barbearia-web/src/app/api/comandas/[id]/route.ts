import { NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveTenant, guardRole, OPERATION_ROLES } from "@/lib/auth-guard";
import { closeOrder } from "@/lib/close-order";
import { logAudit } from "@/lib/audit";

function orderInclude() {
  return {
    customer: { select: { id: true, name: true, phone: true } },
    professional: { select: { id: true, name: true, commissionType: true, commissionValue: true } },
    appointment: { select: { id: true, startsAt: true, service: { select: { name: true } } } },
    items: { include: { service: { select: { id: true, name: true } } } },
    payments: true,
    commissions: true,
  };
}

// GET /api/comandas/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantOrError = await resolveTenant(request);
  if (tenantOrError instanceof NextResponse) return tenantOrError;
  const tenant = tenantOrError;

  const order = await prisma.order.findFirst({
    where: { id, barbershopId: tenant.barbershopId },
    include: orderInclude(),
  });
  if (!order) return NextResponse.json({ error: "Comanda nao encontrada." }, { status: 404 });
  return NextResponse.json(order);
}

// PATCH /api/comandas/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantOrError = await resolveTenant(request);
  if (tenantOrError instanceof NextResponse) return tenantOrError;
  const tenant = tenantOrError;
  const guard = guardRole(tenant.role, OPERATION_ROLES);
  if (guard) return guard;

  // Só os campos usados daqui para baixo: `closeOrder` recarrega itens e
  // profissional por conta própria, então o join de antes virou peso morto.
  const order = await prisma.order.findFirst({
    where: { id, barbershopId: tenant.barbershopId },
    select: { id: true, status: true, discountType: true, discountValue: true },
  });
  if (!order) return NextResponse.json({ error: "Comanda nao encontrada." }, { status: 404 });
  if (order.status === "CLOSED") return NextResponse.json({ error: "Comanda ja fechada." }, { status: 400 });

  const body = await request.json() as {
    action?: "close" | "add_item" | "remove_item";
    paymentMethod?: string;
    paymentAmount?: number;
    item?: { serviceId?: string; productId?: string; name?: string; quantity: number; unitPrice?: number };
    itemId?: string;
    discountType?: string;
    discountValue?: number;
  };

  if (body.action === "add_item" && body.item) {
    const item = body.item;

    if (item.quantity == null || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      return NextResponse.json(
        { error: "Item invalido: quantidade deve ser um inteiro > 0." },
        { status: 400 },
      );
    }

    // Se referenciar um servico, ele precisa pertencer a esta barbearia.
    if (item.serviceId) {
      const svc = await prisma.service.findFirst({
        where: { id: item.serviceId, barbershopId: tenant.barbershopId },
        select: { id: true },
      });
      if (!svc) {
        return NextResponse.json({ error: "Servico nao encontrado." }, { status: 404 });
      }
    }

    // Produto do estoque: valida tenant, ativo/vendavel e saldo disponivel.
    // Nome e preco padrao vem do catalogo (preco pode ser sobrescrito).
    let itemName = item.name?.trim() || "";
    let unitPrice = item.unitPrice;
    if (item.productId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbAny = prisma as any;
      const product = await dbAny.product.findFirst({
        where: { id: item.productId, barbershopId: tenant.barbershopId },
      });
      if (!product) {
        return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
      }
      if (!product.active || !product.sellable) {
        return NextResponse.json({ error: "Produto indisponivel para venda." }, { status: 400 });
      }
      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Estoque insuficiente: restam ${product.stockQuantity} un. de ${product.name}.` },
          { status: 409 },
        );
      }
      itemName = itemName || product.name;
      unitPrice = unitPrice ?? Number(product.salePrice);
    }

    if (!itemName || unitPrice == null || unitPrice < 0) {
      return NextResponse.json(
        { error: "Item invalido: informe nome e preco >= 0." },
        { status: 400 },
      );
    }

    await prisma.orderItem.create({
      data: {
        orderId: id,
        type: item.productId ? "product" : item.serviceId ? "service" : "custom",
        serviceId: item.serviceId ?? null,
        productId: item.productId ?? null,
        name: itemName,
        quantity: item.quantity,
        unitPrice,
        total: unitPrice * item.quantity,
      },
    });
    const allItems = await prisma.orderItem.findMany({ where: { orderId: id } });
    const subtotal = allItems.reduce((s, i) => s + Number(i.total), 0);
    const updated = await prisma.order.update({
      where: { id },
      data: { subtotal, total: subtotal },
      include: orderInclude(),
    });
    return NextResponse.json({ order: updated });
  }

  if (body.action === "remove_item" && body.itemId) {
    // Escopo do delete ao pedido atual: impede remover item de comanda de outro tenant (IDOR).
    const del = await prisma.orderItem.deleteMany({ where: { id: body.itemId, orderId: id } });
    if (del.count === 0) {
      return NextResponse.json({ error: "Item nao encontrado nesta comanda." }, { status: 404 });
    }
    const allItems = await prisma.orderItem.findMany({ where: { orderId: id } });
    const subtotal = allItems.reduce((s, i) => s + Number(i.total), 0);
    const updated = await prisma.order.update({
      where: { id },
      data: { subtotal, total: subtotal },
      include: orderInclude(),
    });
    return NextResponse.json(updated);
  }

  if (body.action === "close") {
    // O metodo agora e validado contra o enum. Antes entrava como
    // `body.paymentMethod as never` e um valor invalido so estourava dentro da
    // transacao, virando 503 "Erro ao fechar a comanda" — mensagem errada para
    // um erro de entrada.
    if (!body.paymentMethod || !(body.paymentMethod in PaymentMethod)) {
      return NextResponse.json(
        { error: "Informe uma forma de pagamento valida." },
        { status: 400 },
      );
    }

    // Baixa de estoque, pagamento e comissao vivem em `lib/close-order.ts`,
    // compartilhado com o Portal do Profissional — dois caminhos de caixa com
    // logica duplicada divergiriam na primeira mudanca de regra.
    const result = await closeOrder({
      orderId: id,
      barbershopId: tenant.barbershopId,
      userId: tenant.userId,
      paymentMethod: body.paymentMethod as PaymentMethod,
      paymentAmount: body.paymentAmount,
      discountType: body.discountType ?? null,
      discountValue: body.discountValue ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await logAudit({
      barbershopId: tenant.barbershopId,
      userId: tenant.userId,
      action: "order.close",
      entity: "Order",
      entityId: id,
      before: { status: order.status },
      after: {
        status: "CLOSED",
        method: body.paymentMethod,
        total: result.total,
        commission: result.commissionAmount,
      },
      request,
    });

    return NextResponse.json(result.order);
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}
