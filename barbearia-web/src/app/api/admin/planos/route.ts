import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const plans = await prisma.plan.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { barbershops: true } } },
  });

  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const body = await request.json() as {
    name?: string;
    slug?: string;
    description?: string;
    price?: number;
    maxProfessionals?: number;
    features?: string[];
    isActive?: boolean;
    displayOrder?: number;
  };

  const { description, features, isActive, displayOrder } = body;
  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();
  const price = Number(body.price);
  const maxProfessionals = body.maxProfessionals ?? -1;

  if (!name || !slug || body.price == null) {
    return NextResponse.json({ error: "name, slug e price são obrigatórios." }, { status: 400 });
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug inválido. Use letras minúsculas, números e hifens." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Preço inválido." }, { status: 400 });
  }
  // -1 é o valor combinado para "ilimitado".
  if (!Number.isInteger(maxProfessionals) || (maxProfessionals < 0 && maxProfessionals !== -1)) {
    return NextResponse.json(
      { error: "Limite de profissionais inválido (use -1 para ilimitado)." },
      { status: 400 },
    );
  }
  if (features != null && (!Array.isArray(features) || features.some((f) => typeof f !== "string"))) {
    return NextResponse.json({ error: "Features deve ser uma lista de textos." }, { status: 400 });
  }

  try {
    // Slug é único no schema: sem esta checagem, o duplicado voltava como
    // erro genérico do Prisma em vez de dizer o que houve.
    const duplicate = await prisma.plan.findUnique({ where: { slug }, select: { id: true } });
    if (duplicate) {
      return NextResponse.json({ error: "Já existe um plano com este slug." }, { status: 409 });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        slug,
        description: description?.trim() || null,
        price,
        maxProfessionals,
        features: features ?? [],
        isActive: isActive ?? true,
        displayOrder: displayOrder ?? 0,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("[admin/planos POST]", error);
    return NextResponse.json({ error: "Não foi possível criar o plano." }, { status: 503 });
  }
}
