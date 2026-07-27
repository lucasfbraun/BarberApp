import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ScheduleBlockType, UserRole } from "@prisma/client";
import {
  guardRole,
  MANAGER_ROLES,
  resolveOwnProfessionalId,
  resolveTenant,
} from "@/lib/auth-guard";
import { getPermissions } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

/** Roles que podem CRIAR bloqueios: gestores e o proprio barbeiro. */
const BLOCK_CREATE_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.PROFESSIONAL,
];

// GET /api/bloqueios?professionalId=&from=&to=
export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  let professionalId = searchParams.get("professionalId") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // PROFESSIONAL ve somente os proprios bloqueios.
  if (ctx.role === UserRole.PROFESSIONAL) {
    const ownId = await resolveOwnProfessionalId(ctx.barbershopId, ctx.userId);
    if (!ownId) {
      return NextResponse.json({ error: "Profissional nao vinculado ao usuario." }, { status: 403 });
    }
    professionalId = ownId;
  }

  try {
    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        barbershopId: ctx.barbershopId,
        ...(professionalId ? { professionalId } : {}),
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        professional: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    return NextResponse.json({ blocks });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar bloqueios." }, { status: 503 });
  }
}

// POST /api/bloqueios
// OWNER/MANAGER: bloqueiam qualquer agenda (ou a barbearia toda, sem professionalId).
// PROFESSIONAL: bloqueia SOMENTE a propria agenda.
// Desbloquear e exclusivo de OWNER/MANAGER (ver DELETE em /api/bloqueios/[id]).
export async function POST(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, BLOCK_CREATE_ROLES);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      professionalId?: string;
      startsAt: string;
      endsAt: string;
      reason?: string;
      type?: string;
    };

    // PROFESSIONAL: forca o bloqueio para a propria agenda.
    if (ctx.role === UserRole.PROFESSIONAL) {
      // Bloquear a propria agenda e configuravel por barbearia (secao 18 do
      // Portal do Profissional). O default e permitido.
      const permissions = await getPermissions(ctx.barbershopId);
      if (!permissions.canBlockSchedule) {
        return NextResponse.json(
          {
            error: "Voce nao tem permissao para bloquear horarios. Fale com o administrador.",
            code: "PERMISSION_DENIED",
          },
          { status: 403 },
        );
      }

      const ownId = await resolveOwnProfessionalId(ctx.barbershopId, ctx.userId);
      if (!ownId) {
        return NextResponse.json(
          { error: "Profissional nao vinculado ao usuario." },
          { status: 403 },
        );
      }
      if (body.professionalId && body.professionalId !== ownId) {
        return NextResponse.json(
          { error: "Voce so pode bloquear a propria agenda." },
          { status: 403 },
        );
      }
      body.professionalId = ownId;
    }

    if (!body.startsAt || !body.endsAt) {
      return NextResponse.json(
        { error: "startsAt e endsAt sao obrigatorios." },
        { status: 400 },
      );
    }

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: "Datas invalidas." }, { status: 400 });
    }

    if (endsAt <= startsAt) {
      return NextResponse.json(
        { error: "endsAt deve ser posterior a startsAt." },
        { status: 400 },
      );
    }

    const validTypes = Object.values(ScheduleBlockType) as string[];
    const type = body.type && validTypes.includes(body.type)
      ? (body.type as ScheduleBlockType)
      : ScheduleBlockType.MANUAL_BLOCK;

    if (body.professionalId) {
      const professional = await prisma.professional.findFirst({
        where: { id: body.professionalId, barbershopId: ctx.barbershopId },
      });
      if (!professional) {
        return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
      }
    }

    const block = await prisma.scheduleBlock.create({
      data: {
        barbershopId: ctx.barbershopId,
        professionalId: body.professionalId ?? null,
        startsAt,
        endsAt,
        reason: body.reason?.trim() ?? null,
        type,
      },
      include: { professional: { select: { id: true, name: true } } },
    });

    await logAudit({
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      action: "schedule.block",
      entity: "ScheduleBlock",
      entityId: block.id,
      after: { startsAt, endsAt, type, professionalId: block.professionalId },
      reason: body.reason?.trim() ?? null,
      request,
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar bloqueio." }, { status: 503 });
  }
}
