import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";

type WeekdayInput = {
  weekday: number; // 0=domingo … 6=sábado
  active: boolean;
  startTime: string; // "HH:MM"
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
};

// GET /api/profissionais/[id]/jornada
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const professional = await prisma.professional.findFirst({
    where: { id, barbershopId: ctx.barbershopId },
  });
  if (!professional) {
    return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
  }

  const workingHours = await prisma.workingHours.findMany({
    where: { professionalId: id },
    orderBy: { weekday: "asc" },
  });

  return NextResponse.json({ workingHours });
}

// PUT /api/profissionais/[id]/jornada — upsert de todos os dias da semana
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { id } = await params;

  const professional = await prisma.professional.findFirst({
    where: { id, barbershopId: ctx.barbershopId },
  });
  if (!professional) {
    return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
  }

  const body = (await request.json()) as { days: WeekdayInput[] };

  if (!Array.isArray(body.days) || body.days.length === 0) {
    return NextResponse.json({ error: "Envie o array 'days'." }, { status: 400 });
  }

  // Valida campos obrigatórios para dias ativos
  for (const day of body.days) {
    if (day.active && (!day.startTime || !day.endTime)) {
      return NextResponse.json(
        { error: `Dia ${day.weekday}: startTime e endTime sao obrigatorios quando ativo.` },
        { status: 400 },
      );
    }
  }

  try {
    const workingHours = await prisma.$transaction(
      body.days.map((day) =>
        prisma.workingHours.upsert({
          where: { professionalId_weekday: { professionalId: id, weekday: day.weekday } },
          create: {
            barbershopId: ctx.barbershopId,
            professionalId: id,
            weekday: day.weekday,
            active: day.active,
            startTime: day.startTime ?? "09:00",
            endTime: day.endTime ?? "18:00",
            breakStart: day.breakStart ?? null,
            breakEnd: day.breakEnd ?? null,
          },
          update: {
            active: day.active,
            startTime: day.startTime ?? "09:00",
            endTime: day.endTime ?? "18:00",
            breakStart: day.breakStart ?? null,
            breakEnd: day.breakEnd ?? null,
          },
        }),
      ),
    );

    return NextResponse.json({ workingHours });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar jornada." }, { status: 503 });
  }
}
