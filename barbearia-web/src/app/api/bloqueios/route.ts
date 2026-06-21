import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ScheduleBlockType } from "@prisma/client";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";

// GET /api/bloqueios?professionalId=&from=&to=
export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const professionalId = searchParams.get("professionalId") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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
export async function POST(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      professionalId?: string;
      startsAt: string;
      endsAt: string;
      reason?: string;
      type?: string;
    };

    if (!body.startsAt || !body.endsAt) {
      return NextResponse.json(
        { error: "startsAt e endsAt sao obrigatorios." },
        { status: 400 },
      );
    }

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);

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

    return NextResponse.json({ block }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar bloqueio." }, { status: 503 });
  }
}
