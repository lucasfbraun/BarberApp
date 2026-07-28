import { NextResponse } from "next/server";
import { TenantStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;

  const barbershop = await prisma.barbershop.findUnique({
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
  const admin = adminOrError;

  try {
    const body = await request.json() as {
      action?: string;
      days?: number;
      planId?: string | null;
      status?: string;
      exempt?: boolean;
    };

    const { action } = body;

    // B7: a barbearia tem de existir antes de qualquer escrita. Sem isto, um
    // id inexistente virava exceção do Prisma sem try/catch — 500 com stack.
    const existing = await prisma.barbershop.findUnique({
      where: { id },
      select: { id: true, trialEndsAt: true, planId: true, status: true, billingExempt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Barbearia não encontrada." }, { status: 404 });
    }

    if (action === "extend_trial") {
      const days = body.days ?? 30;
      // Teto e piso: um "trial" de 10 anos por dedo escorregado no teclado é
      // uma assinatura vitalícia grátis, e negativo encurtaria sem aviso.
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        return NextResponse.json(
          { error: "Informe de 1 a 365 dias." },
          { status: 400 },
        );
      }

      // Estende a partir do fim atual, se ainda estiver no futuro; senão,
      // a partir de hoje.
      const base = existing.trialEndsAt && new Date(existing.trialEndsAt) > new Date()
        ? new Date(existing.trialEndsAt)
        : new Date();
      const newDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

      const updated = await prisma.barbershop.update({
        where: { id },
        data: { trialEndsAt: newDate },
      });

      await logAudit({
        barbershopId: id,
        userId: admin.userId,
        action: "admin.extend_trial",
        entity: "Barbershop",
        entityId: id,
        before: { trialEndsAt: existing.trialEndsAt },
        after: { trialEndsAt: newDate, days },
        request,
      });

      return NextResponse.json({ trialEndsAt: updated.trialEndsAt });
    }

    if (action === "set_plan") {
      // O plano precisa existir — planId inválido deixaria a barbearia
      // apontando para nada e o trial nunca mais bloquearia.
      if (body.planId) {
        const plan = await prisma.plan.findUnique({
          where: { id: body.planId },
          select: { id: true },
        });
        if (!plan) {
          return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
        }
      }

      const updated = await prisma.barbershop.update({
        where: { id },
        data: { planId: body.planId ?? null },
      });

      await logAudit({
        barbershopId: id,
        userId: admin.userId,
        action: "admin.set_plan",
        entity: "Barbershop",
        entityId: id,
        before: { planId: existing.planId },
        after: { planId: updated.planId },
        request,
      });

      return NextResponse.json({ planId: updated.planId });
    }

    if (action === "set_exempt") {
      // Isencao de contrato: barbearia isenta nunca e bloqueada por trial/cobranca.
      const updated = await prisma.barbershop.update({
        where: { id },
        data: { billingExempt: body.exempt === true },
      });

      await logAudit({
        barbershopId: id,
        userId: admin.userId,
        action: "admin.set_exempt",
        entity: "Barbershop",
        entityId: id,
        before: { billingExempt: existing.billingExempt },
        after: { billingExempt: updated.billingExempt },
        request,
      });

      return NextResponse.json({ billingExempt: updated.billingExempt });
    }

    if (action === "set_status") {
      // Validado contra o enum: um status arbitrário estourava dentro do
      // Prisma e voltava como erro genérico.
      if (!body.status || !(body.status in TenantStatus)) {
        return NextResponse.json({ error: "Status inválido." }, { status: 400 });
      }

      const updated = await prisma.barbershop.update({
        where: { id },
        data: { status: body.status as TenantStatus },
      });

      await logAudit({
        barbershopId: id,
        userId: admin.userId,
        action: "admin.set_status",
        entity: "Barbershop",
        entityId: id,
        before: { status: existing.status },
        after: { status: updated.status },
        request,
      });

      return NextResponse.json({ status: updated.status });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("[admin/barbearias PATCH]", error);
    return NextResponse.json({ error: "Não foi possível atualizar." }, { status: 503 });
  }
}
