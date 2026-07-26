import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenant, guardRole, OPERATION_ROLES } from "@/lib/auth-guard";

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
    if (!body.paymentMethod) return NextResponse.json({ error: "Informe o metodo de pagamento." }, { status: 400 });

    // M5: desconto nao pode ser negativo (evita "desconto" que aumenta o total).
    if (body.discountValue != null && body.discountValue < 0) {
      return NextResponse.json({ error: "Desconto invalido." }, { status: 400 });
    }
    if (body.discountType && !["fixed", "percent"].includes(body.discountType)) {
      return NextResponse.json({ error: "Tipo de desconto invalido." }, { status: 400 });
    }
    if (body.paymentAmount != null && body.paymentAmount < 0) {
      return NextResponse.json({ error: "Valor de pagamento invalido." }, { status: 400 });
    }

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

    try {
      await prisma.$transaction(async (tx) => {
        // Baixa automatica de estoque dos itens de produto (com registro de
        // custo e preco no movimento, para o calculo de lucro por produto).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txAny = tx as any;
        const productItems = allItems.filter((i) => (i as { productId?: string | null }).productId);
        for (const pi of productItems) {
          const productId = (pi as { productId?: string | null }).productId as string;
          const product = await txAny.product.findFirst({
            where: { id: productId, barbershopId: tenant.barbershopId },
          });
          if (!product) continue; // produto excluido apos adicionado: nao bloqueia o caixa
          const newBalance = product.stockQuantity - pi.quantity;
          if (newBalance < 0) {
            throw new Error(`STOCK:${product.name}:${product.stockQuantity}`);
          }
          await txAny.product.update({
            where: { id: product.id },
            data: { stockQuantity: newBalance },
          });
          await txAny.stockMovement.create({
            data: {
              barbershopId: tenant.barbershopId,
              productId: product.id,
              type: "SALE",
              quantity: -pi.quantity,
              balanceAfter: newBalance,
              unitCost: product.costPrice,
              unitPrice: pi.unitPrice,
              orderId: id,
              orderItemId: pi.id,
              createdById: tenant.userId,
              reason: "Venda na comanda",
            },
          });
        }

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
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("STOCK:")) {
        const [, name, qty] = err.message.split(":");
        return NextResponse.json(
          { error: `Estoque insuficiente para fechar: restam ${qty} un. de ${name}. Ajuste o item ou reponha o estoque.` },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Erro ao fechar a comanda." }, { status: 503 });
    }

    const result = await prisma.order.findFirst({ where: { id }, include: orderInclude() });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}
