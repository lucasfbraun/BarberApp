/**
 * POST /api/public/agendamentos
 * Rota pública — sem autenticação.
 * Cria um agendamento via página pública; resolve barbershopId a partir do professionalId.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      professionalId: string;
      serviceId: string;
      startsAt: string; // ISO string
      customerName: string;
      customerPhone?: string;
      notes?: string;
    };

    const { professionalId, serviceId, startsAt: startsAtStr, customerName, customerPhone, notes } =
      body;

    if (!professionalId || !serviceId || !startsAtStr || !customerName?.trim()) {
      return NextResponse.json(
        { error: "professionalId, serviceId, startsAt e customerName são obrigatórios." },
        { status: 400 },
      );
    }

    const startsAt = new Date(startsAtStr);
    if (isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "startsAt inválido." }, { status: 400 });
    }

    // Resolve barbershopId a partir do profissional
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { barbershopId: true },
    });

    if (!professional) {
      return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
    }

    const { barbershopId } = professional;

    // Valida serviço pertence ao mesmo tenant
    const service = await prisma.service.findFirst({
      where: { id: serviceId, barbershopId, active: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    // Duração: customDurationMinutes do vínculo ou durationMinutes do serviço
    const ps = await prisma.professionalService.findFirst({
      where: { professionalId, serviceId, active: true },
    });
    const durationMinutes = ps?.customDurationMinutes ?? service.durationMinutes;
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    // Anti-conflito
    const conflict = await prisma.appointment.findFirst({
      where: {
        barbershopId,
        professionalId,
        status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
        AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Conflito de horário: este slot não está mais disponível." },
        { status: 409 },
      );
    }

    // Cria ou recupera cliente
    let customerId: string | null = null;
    const phone = customerPhone?.trim() || null;

    const existingCustomer = phone
      ? await prisma.customer.findFirst({ where: { barbershopId, phone } })
      : null;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: { lastVisitAt: startsAt },
      });
    } else {
      const newCustomer = await prisma.customer.create({
        data: {
          barbershopId,
          name: customerName.trim(),
          phone,
          firstVisitAt: startsAt,
          lastVisitAt: startsAt,
        },
      });
      customerId = newCustomer.id;
    }

    const appointment = await prisma.appointment.create({
      data: {
        barbershopId,
        professionalId,
        serviceId,
        customerId,
        startsAt,
        endsAt,
        status: AppointmentStatus.SCHEDULED,
        source: "public_page",
        notes: notes?.trim() ?? null,
      },
      include: {
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error("[public/agendamentos]", err);
    return NextResponse.json({ error: "Erro ao criar agendamento." }, { status: 503 });
  }
}
