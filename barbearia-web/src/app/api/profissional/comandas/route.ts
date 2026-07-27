/**
 * GET  /api/profissional/comandas — comandas abertas do profissional
 * POST /api/profissional/comandas — abre a comanda do atendimento
 *
 * A comanda do barbeiro nasce sempre vinculada a ELE (`professionalId`), o que
 * torna a comissao rastreavel sem depender de escolha manual. Abrir a partir
 * de um agendamento reaproveita a comanda existente — `Order.appointmentId` e
 * unico, entao abrir duas vezes o mesmo atendimento nao duplica o caixa.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveProfessional } from "@/lib/professional-guard";
import { logAudit } from "@/lib/audit";

const ORDER_INCLUDE = {
  customer: { select: { id: true, name: true } },
  appointment: { select: { id: true, startsAt: true, status: true } },
  items: { select: { id: true, name: true, type: true, quantity: true, unitPrice: true, total: true } },
} as const;

export async function GET(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const orders = await prisma.order.findMany({
      where: {
        barbershopId: ctx.barbershopId,
        professionalId: ctx.professionalId,
        status: { in: ["OPEN", "AWAITING_PAYMENT"] },
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        total: Number(o.total),
        items: o.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          total: Number(i.total),
        })),
      })),
    });
  } catch (error) {
    console.error("[profissional/comandas GET]", error);
    return NextResponse.json({ error: "Erro ao carregar comandas." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      appointmentId?: string;
      customerId?: string;
    };

    let customerId = body.customerId ?? null;
    let appointmentId: string | null = null;

    if (body.appointmentId) {
      // O agendamento tem de ser do proprio profissional.
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: body.appointmentId,
          barbershopId: ctx.barbershopId,
          professionalId: ctx.professionalId,
        },
        select: { id: true, customerId: true, serviceId: true },
      });

      if (!appointment) {
        return NextResponse.json(
          { error: "Agendamento nao encontrado na sua agenda." },
          { status: 404 },
        );
      }

      const existing = await prisma.order.findUnique({
        where: { appointmentId: appointment.id },
        include: ORDER_INCLUDE,
      });
      if (existing) {
        return NextResponse.json({ order: existing, reused: true });
      }

      appointmentId = appointment.id;
      customerId = appointment.customerId;

      // A comanda ja nasce com o servico agendado — e o que o barbeiro
      // acabou de fazer; obriga-lo a re-adicionar seria retrabalho.
      const service = appointment.serviceId
        ? await prisma.service.findFirst({
            where: { id: appointment.serviceId, barbershopId: ctx.barbershopId },
            select: { id: true, name: true, price: true },
          })
        : null;

      const link = service
        ? await prisma.professionalService.findFirst({
            where: {
              professionalId: ctx.professionalId,
              serviceId: service.id,
              active: true,
            },
            select: { customPrice: true },
          })
        : null;

      const unitPrice = service ? Number(link?.customPrice ?? service.price) : 0;

      const order = await prisma.order.create({
        data: {
          barbershopId: ctx.barbershopId,
          professionalId: ctx.professionalId,
          appointmentId,
          customerId,
          status: "OPEN",
          subtotal: unitPrice,
          total: unitPrice,
          ...(service
            ? {
                items: {
                  create: [
                    {
                      type: "service",
                      serviceId: service.id,
                      name: service.name,
                      quantity: 1,
                      unitPrice,
                      total: unitPrice,
                    },
                  ],
                },
              }
            : {}),
        },
        include: ORDER_INCLUDE,
      });

      await logAudit({
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        userName: ctx.userName,
        action: "order.open",
        entity: "Order",
        entityId: order.id,
        after: { appointmentId, customerId, fromAppointment: true },
        request,
      });

      return NextResponse.json({ order }, { status: 201 });
    }

    // Comanda avulsa (sem agendamento).
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, barbershopId: ctx.barbershopId },
        select: { id: true },
      });
      if (!customer) {
        return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
      }
    }

    const order = await prisma.order.create({
      data: {
        barbershopId: ctx.barbershopId,
        professionalId: ctx.professionalId,
        customerId,
        status: "OPEN",
        subtotal: 0,
        total: 0,
      },
      include: ORDER_INCLUDE,
    });

    await logAudit({
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      userName: ctx.userName,
      action: "order.open",
      entity: "Order",
      entityId: order.id,
      after: { customerId, fromAppointment: false },
      request,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("[profissional/comandas POST]", error);
    return NextResponse.json({ error: "Erro ao abrir a comanda." }, { status: 503 });
  }
}
