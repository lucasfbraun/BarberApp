import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";

// GET /api/profissionais/[id]/servicos — serviços vinculados ao profissional
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const professional = await prisma.professional.findFirst({
    where: { id, barbershopId: ctx.barbershopId },
  });
  if (!professional) {
    return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
  }

  // Retorna todos os serviços do tenant com flag de vínculo
  const [allServices, linked] = await Promise.all([
    prisma.service.findMany({
      where: { barbershopId: ctx.barbershopId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true, price: true },
    }),
    prisma.professionalService.findMany({
      where: { professionalId: id },
      select: { serviceId: true, customPrice: true, customDurationMinutes: true, active: true },
    }),
  ]);

  const linkedMap = new Map(linked.map((l) => [l.serviceId, l]));

  const services = allServices.map((s) => {
    const link = linkedMap.get(s.id);
    return {
      ...s,
      linked: !!link,
      linkActive: link?.active ?? false,
      customPrice: link?.customPrice ?? null,
      customDurationMinutes: link?.customDurationMinutes ?? null,
    };
  });

  return NextResponse.json({ services });
}

// POST /api/profissionais/[id]/servicos — vincula um serviço
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { id } = await params;

  const professional = await prisma.professional.findFirst({
    where: { id, barbershopId: ctx.barbershopId },
  });
  if (!professional) {
    return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
  }

  const body = (await request.json()) as {
    serviceId: string;
    customPrice?: number | null;
    customDurationMinutes?: number | null;
  };

  if (!body.serviceId) {
    return NextResponse.json({ error: "serviceId e obrigatorio." }, { status: 400 });
  }

  const service = await prisma.service.findFirst({
    where: { id: body.serviceId, barbershopId: ctx.barbershopId },
  });
  if (!service) {
    return NextResponse.json({ error: "Servico nao encontrado." }, { status: 404 });
  }

  try {
    const link = await prisma.professionalService.upsert({
      where: { professionalId_serviceId: { professionalId: id, serviceId: body.serviceId } },
      create: {
        professionalId: id,
        serviceId: body.serviceId,
        customPrice: body.customPrice ?? null,
        customDurationMinutes: body.customDurationMinutes ?? null,
        active: true,
      },
      update: {
        customPrice: body.customPrice ?? null,
        customDurationMinutes: body.customDurationMinutes ?? null,
        active: true,
      },
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao vincular servico." }, { status: 503 });
  }
}

// DELETE /api/profissionais/[id]/servicos — desvincula um serviço (body: { serviceId })
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json()) as { serviceId: string };

  if (!body.serviceId) {
    return NextResponse.json({ error: "serviceId e obrigatorio." }, { status: 400 });
  }

  try {
    await prisma.professionalService.updateMany({
      where: { professionalId: id, serviceId: body.serviceId },
      data: { active: false },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao desvincular servico." }, { status: 503 });
  }
}
