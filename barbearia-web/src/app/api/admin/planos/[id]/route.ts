import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  const allowed = ["name", "slug", "description", "price", "maxProfessionals", "features", "isActive", "displayOrder"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const plan = await db.plan.update({ where: { id }, data });
  return NextResponse.json(plan);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;

  // Desvincula barbearias antes de deletar
  await db.barbershop.updateMany({ where: { planId: id }, data: { planId: null } });
  await db.plan.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
