import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenant, guardRole, MANAGER_ROLES } from "@/lib/auth-guard";

// GET /api/comandas?date=YYYY-MM-DD&status=OPEN&professionalId=xxx
export async function GET(request: Request) {
  const tenantOrError = await resolveTenant(request);
  if (tenantOrError instanceof NextResponse) return tenantOrError;
  const tenant = tenantOrError;
  const guard = guardRole(tenant.role, MANAGER_ROLES);
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const professionalId = searchParams.get("professionalId") ?? undefined;
  const date = searchParams.get("date");

  const where: Record<string, unknown> = { barbershopId: tenant.barbershopId };
  if (status) where.status = status;
  if (professionalId) where.professionalId = professionalId;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  const orders = await prisma.order.findMany({
    where,
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
}

// POST /api/comandas — abrir comanda
export async function POST(request: Request) {
  const tenantOrError = await resolveTenant(request);
  if (tenantOrError instanceof NextResponse) return tenantOrError;
  const tenant = tenantOrError;
  const guard = guardRole(tenant.role, MANAGER_ROLES);
  if (guard) return guard;

  const body = await request.json() as {
    appointmentId?: string;
    customerId?: string;
    professionalId?: string;
    items?: { serviceId?: string; name: string; quantity: number; unitPrice: number }[];
  };

  if (body.appointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: { id: body.appointmentId, barbershopId: tenant.barbershopId },
    });
    if (!appt) return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });
    const existing = await prisma.order.findUnique({ where: { appointmentId: body.appointmentId } });
    if (existing) return NextResponse.json(existing);
  }

  const items = body.items ?? [];
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

  return NextResponse.json(order, { status: 201 });
}
