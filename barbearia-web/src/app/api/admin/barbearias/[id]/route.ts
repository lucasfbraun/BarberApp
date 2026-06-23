import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;

  const barbershop = await db.barbershop.findUnique({
    where: { id },
    include: {
      plan: true,
      resellerLink: {
        include: { reseller: { select: { id: true, name: true, couponCode: true, commissionRate: true } } },
      },
      _count: {
        select: {
          professionals: true,
          services: true,
          appointments: true,
          orders: true,
          customers: true,
        },
      },
    },
  });

  if (!barbershop) {
    return NextResponse.json({ error: "Barbearia não encontrada." }, { status: 404 });
  }

  // Revenue: sum of closed orders
  const revenue = await prisma.order.aggregate({
    where: { barbershopId: id, status: "CLOSED" },
    _sum: { total: true },
  });

  return NextResponse.json({
    ...barbershop,
    totalRevenue: Number(revenue._sum.total ?? 0),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;
  const body = await request.json() as {
    action?: string;
    days?: number;
    planId?: string | null;
    status?: string;
  };

  const { action } = body;

  if (action === "extend_trial") {
    const days = body.days ?? 30;
    const barbershop = await db.barbershop.findUnique({ where: { id }, select: { trialEndsAt: true } });
    const base = barbershop?.trialEndsAt && new Date(barbershop.trialEndsAt) > new Date()
      ? new Date(barbershop.trialEndsAt)
      : new Date();
    const newDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    const updated = await db.barbershop.update({
      where: { id },
      data: { trialEndsAt: newDate },
    });
    return NextResponse.json({ trialEndsAt: updated.trialEndsAt });
  }

  if (action === "set_plan") {
    const updated = await db.barbershop.update({
      where: { id },
      data: { planId: body.planId ?? null },
    });
    return NextResponse.json({ planId: updated.planId });
  }

  if (action === "set_status") {
    const updated = await db.barbershop.update({
      where: { id },
      data: { status: body.status },
    });
    return NextResponse.json({ status: updated.status });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
