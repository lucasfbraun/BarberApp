import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";

// GET /api/profissionais — lista todos os profissionais do tenant
export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const professionals = await prisma.professional.findMany({
      where: { barbershopId: ctx.barbershopId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        photoUrl: true,
        bio: true,
        phone: true,
        email: true,
        commissionType: true,
        commissionValue: true,
        displayOrder: true,
        active: true,
        createdAt: true,
        _count: { select: { appointments: true } },
      },
    });

    return NextResponse.json({ professionals });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar profissionais." }, { status: 503 });
  }
}

// POST /api/profissionais — cria um profissional
export async function POST(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      name?: string;
      photoUrl?: string;
      bio?: string;
      phone?: string;
      email?: string;
      commissionType?: string;
      commissionValue?: number;
      displayOrder?: number;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome e obrigatorio." }, { status: 400 });
    }

    const professional = await prisma.professional.create({
      data: {
        barbershopId: ctx.barbershopId,
        name,
        photoUrl: body.photoUrl?.trim() || null,
        bio: body.bio?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim().toLowerCase() || null,
        commissionType: body.commissionType?.trim() || null,
        commissionValue: body.commissionValue ?? null,
        displayOrder: body.displayOrder ?? 0,
      },
    });

    return NextResponse.json({ professional }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar profissional." }, { status: 503 });
  }
}
