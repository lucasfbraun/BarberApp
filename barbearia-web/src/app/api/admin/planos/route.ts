import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(request: Request) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const plans = await db.plan.findMany({
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

  const { name, slug, description, price, maxProfessionals, features, isActive, displayOrder } = body;

  if (!name || !slug || price == null) {
    return NextResponse.json({ error: "name, slug e price são obrigatórios." }, { status: 400 });
  }

  const plan = await db.plan.create({
    data: {
      name,
      slug,
      description: description ?? null,
      price,
      maxProfessionals: maxProfessionals ?? -1,
      features: features ?? [],
      isActive: isActive ?? true,
      displayOrder: displayOrder ?? 0,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
