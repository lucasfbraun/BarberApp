import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

// DELETE /api/bloqueios/[id]
// REGRA DE NEGOCIO: desbloquear agenda e EXCLUSIVO do admin do tenant
// (OWNER/MANAGER). O barbeiro (PROFESSIONAL) pode criar bloqueios na propria
// agenda, mas NAO pode remove-los — nem os proprios.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) {
    return NextResponse.json(
      { error: "Somente o administrador da barbearia pode desbloquear a agenda." },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const block = await prisma.scheduleBlock.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
    });

    if (!block) {
      return NextResponse.json({ error: "Bloqueio nao encontrado." }, { status: 404 });
    }

    await prisma.scheduleBlock.delete({ where: { id } });

    await logAudit({
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      action: "schedule.unblock",
      entity: "ScheduleBlock",
      entityId: id,
      before: {
        startsAt: block.startsAt,
        endsAt: block.endsAt,
        type: block.type,
        professionalId: block.professionalId,
      },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao remover bloqueio." }, { status: 503 });
  }
}
