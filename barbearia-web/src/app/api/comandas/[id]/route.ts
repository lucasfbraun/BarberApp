import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenant, guardRole, MANAGER_ROLES } from "@/lib/auth-guard";

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
  const guard = guardRole(tenant.role, MANAGER_ROLES);
  if (guard) return guard;

  const order = await prisma.order.findFirst({
    where: { id, barbershopId: tenant.barbershopId },
    include: { items: true, professional: true },
  });
  if (!order) return NextResponse.json({ error: "Comanda nao encontrada." }, { status: 404 });
  if (order.status === "CLOSED") return NextResponse.json({ error: "Comanda ja fechada." }, { status: 400 });

  const body = await request.json() as {
    action?: "close" | "add_item" | "remove_item";
    paymentMethod?: string;
    paymentAmount?: number;
    item?: { serviceId?: string; name: string; quantity: number; unitPrice: number };
    itemId?: string;
    discountType?: string;
    discountValue?: number;
  };

  if (body.action === "add_item" && body.item) {
    const item = body.item;

    // Valida valores do item (evita total negativo / manipulacao).
    if (!item.name?.trim() || item.quantity == null || item.quantity <= 0 || item.unitPrice == null || item.unitPrice < 0) {
      return NextResponse.json(
        { error: "Item invalido: informe nome, quantidade > 0 e preco >= 0." },
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

    await prisma.orderItem.create({
      data: {
        orderId: id,
        type: item.serviceId ? "service" : "custom",
        serviceId: item.serviceId ?? null,
        name: item.name.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity,
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
    if (!body.paymentMethod) return NextResponse.json({ error: "Informe o metodo de pagamento." }, { status: 400 });

    const allItems = await prisma.orderItem.findMany({ where: { orderId: id } });
    const subtotal = allItems.reduce((s, i) => s + Number(i.total), 0);
    let discountAmount = 0;
    if (body.discountType === "fixed") discountAmount = body.discountValue ?? 0;
    if (body.discountType === "percent") discountAmount = subtotal * ((body.discountValue ?? 0) / 100);
    const total = Math.max(0, subtotal - discountAmount);
    const paymentAmount = body.paymentAmount ?? total;

    let commissionAmount = 0;
    let commissionRate = 0;
    let commissionType = "percent";
    if (order.professional?.commissionValue && order.professional?.commissionType) {
      commissionType = order.professional.commissionType;
      if (commissionType === "percent") {
        commissionRate = order.professional.commissionValue;
        commissionAmount = total * (commissionRate / 100);
      } else {
        commissionRate = order.professional.commissionValue;
        commissionAmount = commissionRate;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: "CLOSED",
          subtotal,
          discountType: body.discountType ?? null,
          discountValue: body.discountValue ?? null,
          total,
          paymentStatus: "paid",
          closedAt: new Date(),
        },
      });

      await tx.payment.create({
        data: {
          barbershopId: tenant.barbershopId,
          orderId: id,
          amount: paymentAmount,
          method: body.paymentMethod as never,
          status: "paid",
          paidAt: new Date(),
        },
      });

      if (order.professionalId && commissionAmount > 0) {
        await tx.commission.create({
          data: {
            barbershopId: tenant.barbershopId,
            professionalId: order.professionalId,
            orderId: id,
            grossAmount: total,
            commissionType,
            commissionRate,
            commissionAmount,
            status: "PENDING",
          },
        });
      }
    });

    const result = await prisma.order.findFirst({ where: { id }, include: orderInclude() });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}
