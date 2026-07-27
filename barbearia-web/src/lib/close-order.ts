/**
 * Fechamento de comanda — logica unica de caixa.
 *
 * Extraida de `/api/comandas/[id]` quando o Portal do Profissional ganhou o
 * direito de receber pagamento (permissao `canReceivePayment`). Ter dois
 * lugares fechando comanda seria a forma mais rapida de os dois divergirem:
 * um baixando estoque e o outro nao, um gerando comissao com base diferente.
 *
 * O que acontece aqui, sempre na MESMA transacao serializavel:
 *   1. baixa de estoque dos itens de produto, com movimento de auditoria;
 *   2. fechamento da comanda com o total ja descontado;
 *   3. registro do pagamento;
 *   4. geracao da comissao.
 *
 * A ordem importa: se o estoque nao fecha, nada acontece — nem pagamento, nem
 * comissao.
 */

import type { PaymentMethod, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type CloseOrderInput = {
  orderId: string;
  barbershopId: string;
  userId: string;
  paymentMethod: PaymentMethod;
  /** Valor recebido. Ausente = total da comanda. */
  paymentAmount?: number;
  /** Sobrescreve o desconto gravado na comanda (usado pelo caixa). */
  discountType?: string | null;
  discountValue?: number | null;
};

const ORDER_INCLUDE = {
  customer: { select: { id: true, name: true } },
  professional: { select: { id: true, name: true } },
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
} satisfies Prisma.OrderInclude;

/**
 * Comanda fechada, com o mesmo formato que as duas rotas de caixa devolvem.
 * Derivado do include acima — se um campo mudar la, o tipo acompanha.
 */
export type ClosedOrder = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export type CloseOrderResult =
  | { ok: true; order: ClosedOrder; total: number; commissionAmount: number }
  | { ok: false; error: string; status: number };

export async function closeOrder(input: CloseOrderInput): Promise<CloseOrderResult> {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, barbershopId: input.barbershopId },
    include: {
      items: true,
      professional: { select: { id: true, commissionType: true, commissionValue: true } },
    },
  });

  if (!order) {
    return { ok: false, error: "Comanda nao encontrada.", status: 404 };
  }
  if (order.status === "CLOSED") {
    return { ok: false, error: "Comanda ja fechada.", status: 400 };
  }
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { ok: false, error: "Esta comanda nao pode ser fechada.", status: 400 };
  }
  if (order.items.length === 0) {
    return { ok: false, error: "Comanda sem itens.", status: 400 };
  }

  // Desconto: o informado agora, ou o que ja estava gravado na comanda.
  const discountType =
    input.discountType !== undefined ? input.discountType : order.discountType;
  const discountValue =
    input.discountValue !== undefined
      ? input.discountValue
      : order.discountValue == null
        ? null
        : Number(order.discountValue);

  if (discountValue != null && discountValue < 0) {
    return { ok: false, error: "Desconto invalido.", status: 400 };
  }
  if (discountType && !["fixed", "percent"].includes(discountType)) {
    return { ok: false, error: "Tipo de desconto invalido.", status: 400 };
  }
  if (input.paymentAmount != null && input.paymentAmount < 0) {
    return { ok: false, error: "Valor de pagamento invalido.", status: 400 };
  }

  const subtotal = order.items.reduce((s, i) => s + Number(i.total), 0);

  let discountAmount = 0;
  if (discountType === "fixed") discountAmount = discountValue ?? 0;
  if (discountType === "percent") discountAmount = subtotal * ((discountValue ?? 0) / 100);

  const total = Math.max(0, subtotal - discountAmount);
  const paymentAmount = input.paymentAmount ?? total;

  // Comissao sobre o total efetivamente cobrado (secao 9, regra 2 e 4).
  let commissionAmount = 0;
  let commissionRate = 0;
  let commissionType = "percent";
  if (order.professional?.commissionValue && order.professional?.commissionType) {
    commissionType = order.professional.commissionType;
    commissionRate = order.professional.commissionValue;
    commissionAmount =
      commissionType === "percent" ? total * (commissionRate / 100) : commissionRate;
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // 1. Estoque dos itens de produto.
        const productItems = order.items.filter((i) => i.productId);
        for (const item of productItems) {
          const product = await tx.product.findFirst({
            where: { id: item.productId as string, barbershopId: input.barbershopId },
          });
          // Produto excluido depois de adicionado nao trava o caixa.
          if (!product) continue;

          const newBalance = product.stockQuantity - item.quantity;
          if (newBalance < 0) {
            throw new Error(`STOCK:${product.name}:${product.stockQuantity}`);
          }

          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: newBalance },
          });

          await tx.stockMovement.create({
            data: {
              barbershopId: input.barbershopId,
              productId: product.id,
              type: "SALE",
              quantity: -item.quantity,
              balanceAfter: newBalance,
              unitCost: product.costPrice,
              unitPrice: item.unitPrice,
              orderId: order.id,
              orderItemId: item.id,
              createdById: input.userId,
              reason: "Venda na comanda",
            },
          });
        }

        // 2. Comanda.
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CLOSED",
            subtotal,
            discountType: discountType ?? null,
            discountValue: discountValue ?? null,
            total,
            paymentStatus: "paid",
            closedAt: new Date(),
          },
        });

        // 3. Pagamento.
        await tx.payment.create({
          data: {
            barbershopId: input.barbershopId,
            orderId: order.id,
            amount: paymentAmount,
            method: input.paymentMethod,
            status: "paid",
            paidAt: new Date(),
          },
        });

        // 4. Comissao.
        if (order.professionalId && commissionAmount > 0) {
          await tx.commission.create({
            data: {
              barbershopId: input.barbershopId,
              professionalId: order.professionalId,
              orderId: order.id,
              grossAmount: total,
              commissionType,
              commissionRate,
              commissionAmount,
              status: "PENDING",
            },
          });
        }
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("STOCK:")) {
      const [, name, qty] = err.message.split(":");
      return {
        ok: false,
        error: `Estoque insuficiente para fechar: restam ${qty} un. de ${name}. Ajuste o item ou reponha o estoque.`,
        status: 409,
      };
    }
    console.error("[close-order]", err);
    return { ok: false, error: "Erro ao fechar a comanda.", status: 503 };
  }

  const closed = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: ORDER_INCLUDE,
  });

  return { ok: true, order: closed, total, commissionAmount };
}
