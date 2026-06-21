/**
 * GET /api/disponibilidade
 *
 * Query params:
 *   professionalId  — obrigatório
 *   serviceId       — obrigatório
 *   date            — obrigatório, formato YYYY-MM-DD
 *
 * Retorna lista de slots disponíveis para o dia solicitado.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTenant } from "@/lib/auth-guard";
import { computeAvailableSlots } from "@/lib/availability";

export async function GET(request: Request) {
  // Rota pública e interna — tenta resolver tenant mas não bloqueia acesso à pág. pública
  const { searchParams } = new URL(request.url);
  const professionalId = searchParams.get("professionalId");
  const serviceId = searchParams.get("serviceId");
  const dateStr = searchParams.get("date"); // "YYYY-MM-DD"

  if (!professionalId || !serviceId || !dateStr) {
    return NextResponse.json(
      { error: "Parametros obrigatorios: professionalId, serviceId, date." },
      { status: 400 },
    );
  }

  // Resolve o barbershopId — pode vir do JWT (painel) ou do profissional (pág. pública)
  let barbershopId: string;

  const ctxResult = await resolveTenant(request);
  if (ctxResult instanceof NextResponse) {
    // Sem sessão: resolve pelo profissional (página pública)
    const prof = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { barbershopId: true },
    });
    if (!prof) {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }
    barbershopId = prof.barbershopId;
  } else {
    barbershopId = ctxResult.barbershopId;
  }

  // Valida data
  const date = new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Data invalida." }, { status: 400 });
  }

  try {
    // Busca o profissional (com jornada)
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, barbershopId, active: true },
      include: { workingHours: true },
    });

    if (!professional) {
      return NextResponse.json({ error: "Profissional nao encontrado ou inativo." }, { status: 404 });
    }

    // Busca o serviço e verifica se o profissional o realiza
    const service = await prisma.service.findFirst({
      where: { id: serviceId, barbershopId, active: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Servico nao encontrado ou inativo." }, { status: 404 });
    }

    // Duração efetiva: customização por profissional ou padrão do serviço
    const profService = await prisma.professionalService.findFirst({
      where: { professionalId, serviceId, active: true },
    });
    const durationMinutes =
      profService?.customDurationMinutes ?? service.durationMinutes;

    // Agendamentos existentes do dia
    const startOfDay = new Date(`${dateStr}T00:00:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59`);

    const appointments = await prisma.appointment.findMany({
      where: {
        barbershopId,
        professionalId,
        status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
        startsAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { startsAt: true, endsAt: true },
    });

    // Bloqueios que se sobrepõem ao dia
    const blocks = await prisma.scheduleBlock.findMany({
      where: {
        barbershopId,
        professionalId,
        startsAt: { lte: endOfDay },
        endsAt: { gte: startOfDay },
      },
      select: { startsAt: true, endsAt: true },
    });

    const busyIntervals = [
      ...appointments.map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt })),
      ...blocks.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
    ];

    const slots = computeAvailableSlots({
      date,
      durationMinutes,
      workingHours: professional.workingHours,
      busyIntervals,
    });

    return NextResponse.json({ slots, durationMinutes });
  } catch {
    return NextResponse.json({ error: "Erro ao calcular disponibilidade." }, { status: 503 });
  }
}
