import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";

// GET /api/profissionais/[id] — detalhe de um profissional
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  try {
    const professional = await prisma.professional.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
      include: {
        workingHours: { orderBy: { weekday: "asc" } },
        services: {
          include: { service: { select: { id: true, name: true, price: true } } },
          where: { active: true },
        },
      },
    });

    if (!professional) {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ professional });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar profissional." }, { status: 503 });
  }
}

// PATCH /api/profissionais/[id] — atualiza um profissional
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { id } = await params;

  try {
    const existing = await prisma.professional.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: string;
      photoUrl?: string;
      bio?: string;
      phone?: string;
      email?: string;
      commissionType?: string;
      commissionValue?: number | null;
      displayOrder?: number;
      active?: boolean;
    };

    const professional = await prisma.professional.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        photoUrl: "photoUrl" in body ? (body.photoUrl?.trim() || null) : existing.photoUrl,
        bio: "bio" in body ? (body.bio?.trim() || null) : existing.bio,
        phone: "phone" in body ? (body.phone?.trim() || null) : existing.phone,
        email: "email" in body ? (body.email?.trim().toLowerCase() || null) : existing.email,
        commissionType: "commissionType" in body ? (body.commissionType?.trim() || null) : existing.commissionType,
        commissionValue: "commissionValue" in body ? (body.commissionValue ?? null) : existing.commissionValue,
        displayOrder: body.displayOrder ?? existing.displayOrder,
        active: typeof body.active === "boolean" ? body.active : existing.active,
      },
    });

    return NextResponse.json({ professional });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar profissional." }, { status: 503 });
  }
}

// DELETE /api/profissionais/[id] — desativa (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { id } = await params;

  try {
    const existing = await prisma.professional.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }

    await prisma.professional.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao desativar profissional." }, { status: 503 });
  }
}
