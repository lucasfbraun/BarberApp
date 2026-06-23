import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenant } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const tenantOrError = await resolveTenant(request);
  if (tenantOrError instanceof NextResponse) return tenantOrError;
  const tenant = tenantOrError;

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  const [appointments, orders, commissions] = await Promise.all([
    prisma.appointment.findMany({
      where: { barbershopId: tenant.barbershopId, startsAt: { gte: start, lte: end } },
      include: {
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true } },
        customer: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.order.findMany({
      where: {
        barbershopId: tenant.barbershopId,
        status: "CLOSED",
        closedAt: { gte: start, lte: end },
      },
      include: {
        professional: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        items: true,
        payments: true,
      },
    }),
    prisma.commission.findMany({
      where: {
        barbershopId: tenant.barbershopId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        professional: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Summary
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalCommissions = commissions.reduce((s, c) => s + Number(c.commissionAmount), 0);

  const byStatus = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  // Payment method breakdown
  const byPayment = orders.flatMap((o) => o.payments).reduce<Record<string, number>>((acc, p) => {
    acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount);
    return acc;
  }, {});

  // Per professional
  const profMap = new Map<string, { id: string; name: string; appointments: number; revenue: number; commission: number }>();

  for (const a of appointments) {
    if (!a.professional) continue;
    const p = profMap.get(a.professional.id) ?? { id: a.professional.id, name: a.professional.name, appointments: 0, revenue: 0, commission: 0 };
    p.appointments += 1;
    profMap.set(a.professional.id, p);
  }

  for (const o of orders) {
    if (!o.professional) continue;
    const p = profMap.get(o.professional.id) ?? { id: o.professional.id, name: o.professional.name, appointments: 0, revenue: 0, commission: 0 };
    p.revenue += Number(o.total);
    profMap.set(o.professional.id, p);
  }

  for (const c of commissions) {
    const p = profMap.get(c.professional.id) ?? { id: c.professional.id, name: c.professional.name, appointments: 0, revenue: 0, commission: 0 };
    p.commission += Number(c.commissionAmount);
    profMap.set(c.professional.id, p);
  }

  return NextResponse.json({
    date: dateStr,
    summary: {
      totalAppointments: appointments.length,
      byStatus,
      totalRevenue,
      totalCommissions,
      netRevenue: totalRevenue - totalCommissions,
      closedOrders: orders.length,
      byPayment,
    },
    professionals: Array.from(profMap.values()),
    orders: orders.map((o) => ({
      id: o.id,
      customer: o.customer?.name ?? "—",
      professional: o.professional?.name ?? "—",
      total: Number(o.total),
      closedAt: o.closedAt,
      payments: o.payments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt,
      status: a.status,
      professional: a.professional?.name ?? "—",
      customer: a.customer?.name ?? "—",
      service: a.service?.name ?? "—",
    })),
  });
}
