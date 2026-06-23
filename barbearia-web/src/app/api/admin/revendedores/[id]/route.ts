import { NextResponse } from "next/server";
import { resolveAdmin } from "@/lib/auth-guard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { prisma } from "@/lib/prisma";
const db = prisma as any;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;
  const body = await request.json() as { action?: string; commissionRate?: number };

  if (body.action === "approve") {
    const updated = await db.reseller.update({ where: { id }, data: { status: "ACTIVE" } });
    return NextResponse.json({ status: updated.status });
  }

  if (body.action === "deactivate") {
    const updated = await db.reseller.update({ where: { id }, data: { status: "INACTIVE" } });
    return NextResponse.json({ status: updated.status });
  }

  if (body.action === "set_commission" && body.commissionRate != null) {
    const updated = await db.reseller.update({ where: { id }, data: { commissionRate: body.commissionRate } });
    return NextResponse.json({ commissionRate: updated.commissionRate });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
