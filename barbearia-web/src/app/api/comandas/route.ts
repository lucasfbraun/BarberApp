import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveTenant, guardRole, OPERATION_ROLES } from "@/lib/auth-guard";
import { dayRangeInTimeZone, DEFAULT_TIMEZONE } from "@/lib/availability";
import { logAudit } from "@/lib/audit";

// GET /api/comandas?date=YYYY-MM-DD&status=OPEN&professionalId=xxx
export async function GET(request: Request) {
  const tenantOrError = await resolveTenant(request);
  if (tenantOrError instanceof NextResponse) return tenantOrError;
  const tenant = tenantOrError;
  const guard = guardRole(tenant.role, OPERATION_ROLES);
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? undefined;
  const professionalId = searchParams.get("professionalId") ?? undefined;
  const date = searchParams.get("date");

  // O status ia direto para o Prisma: um valor fora do enum lancava e, sem
  // try/catch, o handler devolvia 500 com stack do framework.
  // Aceita tambem lista separada por virgula ("OPEN,AWAITING_PAYMENT"), que e
  // como a tela do caixa pede as comandas em aberto.
  let statusFilter: OrderStatus[] | undefined;
  if (statusParam) {
    const requested = statusParam.split(",").map((s) => s.trim().toUpperCase());
    const invalid = requested.filter((s) => !(s in OrderStatus));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Status invalido: ${invalid.join(", ")}.` },
        { status: 400 },
      );
    }
    statusFilter = requested as OrderStatus[];
  }

  try {
    // Dia civil no fuso da barbearia. Antes usava `setHours`, que roda no
    // relogio do servidor — em UTC na Vercel, a janela saia tres horas
    // deslocada e comandas da noite caiam no dia seguinte.
    const barbershop = await prisma.barbershop.findUnique({
      where: { id: tenant.barbershopId },
      select: { timezone: true },
    });
    const timeZone = barbershop?.timezone || DEFAULT_TIMEZONE;

    let createdAt: { gte: Date; lt: Date } | undefined;
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "Data invalida." }, { status: 400 });
      }
      const { start, end } = dayRangeInTimeZone(date, timeZone);
      createdAt = { gte: start, lt: end };
    }

    const orders = await prisma.order.findMany({
      where: {
        barbershopId: tenant.barbershopId,
        ...(statusFilter ? { status: { in: statusFilter } } : {}),
        ...(professionalId ? { professionalId } : {}),
        ...(createdAt ? { createdAt } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        professional: { select: { id: true, name: true, commissionType: true, commissionValue: true } },
        appointment: { select: { id: true, startsAt: true, endsAt: true } },
        items: { include: { service: { select: { id: true, name: true } } } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("[comandas GET]", error);
    return NextResponse.json({ error: "Erro ao buscar comandas." }, { status: 503 });
  }
}

// POST /api/comandas — abrir comanda
export async function POST(request: Request) {
  const tenantOrError = await resolveTenant(request);
  if (tenantOrError instanceof NextResponse) return tenantOrError;
  const tenant = tenantOrError;
  const guard = guardRole(tenant.role, OPERATION_ROLES);
  if (guard) return guard;

  const body = await request.json() as {
    appointmentId?: string;
    customerId?: string;
    professionalId?: string;
    items?: { serviceId?: string; name: string; quantity: number; unitPrice: number }[];
  };

  try {
    // ── N1: TODO id recebido tem de pertencer a ESTA barbearia ──────────────
    //
    // Antes, so o `appointmentId` era conferido; `customerId`, `professionalId`
    // e `items[].serviceId` iam direto para o create. Duas consequencias reais:
    //  1. a comanda passava a exibir nome de cliente/profissional de OUTRO
    //     tenant (o include devolve o nome), vazando dado entre barbearias;
    //  2. ao fechar, nascia uma Commission com `barbershopId` daqui e
    //     `professionalId` de la — corrompendo o relatorio das duas.
    //
    // E o mesmo padrao que o A1 corrigiu no PATCH; aqui tinha ficado de fora.

    if (body.appointmentId) {
      const appt = await prisma.appointment.findFirst({
        where: { id: body.appointmentId, barbershopId: tenant.barbershopId },
        select: { id: true },
      });
      if (!appt) {
        return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });
      }
      const existing = await prisma.order.findUnique({
        where: { appointmentId: body.appointmentId },
        include: {
          items: true,
          customer: { select: { id: true, name: true, phone: true } },
          professional: {
            select: { id: true, name: true, commissionType: true, commissionValue: true },
          },
        },
      });
      if (existing) return NextResponse.json(existing);
    }

    if (body.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: body.customerId, barbershopId: tenant.barbershopId },
        select: { id: true },
      });
      if (!customer) {
        return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
      }
    }

    if (body.professionalId) {
      const professional = await prisma.professional.findFirst({
        where: { id: body.professionalId, barbershopId: tenant.barbershopId },
        select: { id: true },
      });
      if (!professional) {
        return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
      }
    }

    const items = body.items ?? [];

    // M5: valida itens iniciais (nome, quantidade > 0, preco >= 0).
    for (const i of items) {
      if (!i.name?.trim() || i.quantity == null || i.quantity <= 0 || i.unitPrice == null || i.unitPrice < 0) {
        return NextResponse.json(
          { error: "Item invalido: informe nome, quantidade > 0 e preco >= 0." },
          { status: 400 },
        );
      }
    }

    // Servicos dos itens: uma consulta so, em vez de uma por item.
    const serviceIds = [...new Set(items.map((i) => i.serviceId).filter(Boolean))] as string[];
    if (serviceIds.length > 0) {
      const found = await prisma.service.findMany({
        where: { id: { in: serviceIds }, barbershopId: tenant.barbershopId },
        select: { id: true },
      });
      if (found.length !== serviceIds.length) {
        return NextResponse.json(
          { error: "Um dos servicos informados nao pertence a esta barbearia." },
          { status: 404 },
        );
      }
    }

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    const order = await prisma.order.create({
      data: {
        barbershopId: tenant.barbershopId,
        appointmentId: body.appointmentId ?? null,
        customerId: body.customerId ?? null,
        professionalId: body.professionalId ?? null,
        subtotal,
        total: subtotal,
        status: "OPEN",
        items: {
          create: items.map((i) => ({
            type: i.serviceId ? "service" : "custom",
            serviceId: i.serviceId ?? null,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.unitPrice * i.quantity,
          })),
        },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true, phone: true } },
        professional: { select: { id: true, name: true, commissionType: true, commissionValue: true } },
      },
    });

    await logAudit({
      barbershopId: tenant.barbershopId,
      userId: tenant.userId,
      action: "order.open",
      entity: "Order",
      entityId: order.id,
      after: {
        appointmentId: body.appointmentId ?? null,
        customerId: body.customerId ?? null,
        professionalId: body.professionalId ?? null,
        items: items.length,
      },
      request,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("[comandas POST]", error);
    return NextResponse.json({ error: "Erro ao abrir a comanda." }, { status: 503 });
  }
}
