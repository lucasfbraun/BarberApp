import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";

// DELETE /api/bloqueios/[id]
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
    const block = await prisma.scheduleBlock.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
    });

    if (!block) {
      return NextResponse.json({ error: "Bloqueio nao encontrado." }, { status: 404 });
    }

    await prisma.scheduleBlock.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao remover bloqueio." }, { status: 503 });
  }
}
