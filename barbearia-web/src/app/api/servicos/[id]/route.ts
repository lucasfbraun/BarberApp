import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";

// GET /api/servicos/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  try {
    const service = await prisma.service.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
      include: {
        category: { select: { id: true, name: true } },
        professionals: {
          where: { active: true },
          include: { professional: { select: { id: true, name: true } } },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Servico nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar servico." }, { status: 503 });
  }
}

// PATCH /api/servicos/[id]
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
    const existing = await prisma.service.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Servico nao encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      durationMinutes?: number;
      price?: number;
      categoryId?: string | null;
      imageUrl?: string | null;
      active?: boolean;
    };

    const service = await prisma.service.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        description: "description" in body ? (body.description?.trim() || null) : existing.description,
        durationMinutes: body.durationMinutes ?? existing.durationMinutes,
        price: body.price ?? existing.price,
        categoryId: "categoryId" in body ? (body.categoryId ?? null) : existing.categoryId,
        imageUrl: "imageUrl" in body ? (body.imageUrl?.trim() || null) : existing.imageUrl,
        active: typeof body.active === "boolean" ? body.active : existing.active,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ service });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar servico." }, { status: 503 });
  }
}

// DELETE /api/servicos/[id] — desativa (soft delete)
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
    const existing = await prisma.service.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Servico nao encontrado." }, { status: 404 });
    }

    await prisma.service.update({ where: { id }, data: { active: false } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao desativar servico." }, { status: 503 });
  }
}
