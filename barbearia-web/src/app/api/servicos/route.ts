import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";

// GET /api/servicos — lista todos os serviços do tenant
export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const services = await prisma.service.findMany({
      where: { barbershopId: ctx.barbershopId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { appointments: true } },
      },
    });

    return NextResponse.json({ services });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar servicos." }, { status: 503 });
  }
}

// POST /api/servicos — cria um serviço
export async function POST(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      durationMinutes?: number;
      price?: number;
      categoryId?: string;
      imageUrl?: string;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Nome e obrigatorio." }, { status: 400 });
    }

    if (!body.durationMinutes || body.durationMinutes < 5) {
      return NextResponse.json(
        { error: "Duracao minima e 5 minutos." },
        { status: 400 },
      );
    }

    if (body.price == null || body.price < 0) {
      return NextResponse.json({ error: "Preco invalido." }, { status: 400 });
    }

    // Verifica categoria se fornecida
    if (body.categoryId) {
      const cat = await prisma.serviceCategory.findFirst({
        where: { id: body.categoryId, barbershopId: ctx.barbershopId },
      });
      if (!cat) {
        return NextResponse.json({ error: "Categoria nao encontrada." }, { status: 404 });
      }
    }

    const service = await prisma.service.create({
      data: {
        barbershopId: ctx.barbershopId,
        name,
        description: body.description?.trim() || null,
        durationMinutes: body.durationMinutes,
        price: body.price,
        categoryId: body.categoryId || null,
        imageUrl: body.imageUrl?.trim() || null,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar servico." }, { status: 503 });
  }
}
