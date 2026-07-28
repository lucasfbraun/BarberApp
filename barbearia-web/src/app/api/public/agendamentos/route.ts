/**
 * POST /api/public/agendamentos
 * Agendamento da página pública — EXIGE cliente logado.
 * Resolve barbershopId a partir do professionalId, vincula o Customer da
 * barbearia à conta do cliente e grava a última barbearia acessada.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { resolveCustomer } from "@/lib/auth-guard";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // M6: throttle por IP — 10 agendamentos por minuto.
  if (isRateLimited(`public-agendamentos:${getClientIp(request)}`, { limit: 10, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  // Cliente precisa estar logado para agendar.
  const customer = await resolveCustomer(request);
  if (customer instanceof NextResponse) return customer;

  try {
    const body = (await request.json()) as {
      professionalId: string;
      serviceId: string;
      startsAt: string; // ISO string
      customerName?: string;
      customerPhone?: string;
      notes?: string;
    };

    const { professionalId, serviceId, startsAt: startsAtStr, notes } = body;
    const customerName = body.customerName?.trim() || customer.name;
    const customerPhone = body.customerPhone?.trim() || customer.phone || undefined;

    if (!professionalId || !serviceId || !startsAtStr) {
      return NextResponse.json(
        { error: "professionalId, serviceId e startsAt são obrigatórios." },
        { status: 400 },
      );
    }

    const startsAt = new Date(startsAtStr);
    if (isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "startsAt inválido." }, { status: 400 });
    }

    // M5: não permitir agendamento no passado.
    if (startsAt < new Date()) {
      return NextResponse.json({ error: "Não é possível agendar no passado." }, { status: 400 });
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

    // M5: exigir vínculo ativo profissional<->serviço (sem fallback de duração).
    const ps = await prisma.professionalService.findFirst({
      where: { professionalId, serviceId, active: true },
    });
    if (!ps) {
      return NextResponse.json(
        { error: "Este profissional não realiza o serviço selecionado." },
        { status: 400 },
      );
    }
    const durationMinutes = ps.customDurationMinutes ?? service.durationMinutes;
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    // Cria ou recupera o registro Customer desta barbearia, sempre
    // vinculado a conta do cliente logado (userId).
    let customerId: string | null = null;
    const phone = customerPhone?.trim() || null;

    const existingCustomer =
      (await prisma.customer.findFirst({ where: { barbershopId, userId: customer.userId } })) ??
      (phone ? await prisma.customer.findFirst({ where: { barbershopId, phone } }) : null);

    if (existingCustomer) {
      customerId = existingCustomer.id;
      await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: { lastVisitAt: startsAt, userId: customer.userId, ...(phone ? { phone } : {}) },
      });
    } else {
      const newCustomer = await prisma.customer.create({
        data: {
          barbershopId,
          userId: customer.userId,
          name: customerName,
          phone,
          email: customer.email,
          firstVisitAt: startsAt,
          lastVisitAt: startsAt,
        },
      });
      customerId = newCustomer.id;
    }

    // M1: anti-conflito e criação na MESMA transação serializável (evita TOCTOU).
    let appointment;
    try {
      appointment = await prisma.$transaction(
        async (tx) => {
          const conflict = await tx.appointment.findFirst({
            where: {
              barbershopId,
              professionalId,
              status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
              AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
            },
          });
          if (conflict) throw new Error("CONFLICT");

          return tx.appointment.create({
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
        },
        { isolationLevel: "Serializable" },
      );
    } catch (err) {
      if (err instanceof Error && err.message === "CONFLICT") {
        return NextResponse.json(
          { error: "Conflito de horário: este slot não está mais disponível." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Este horário acabou de ser reservado. Escolha outro slot." },
        { status: 409 },
      );
    }

    // "Última barbearia": próximo acesso do cliente abre esta barbearia.
    await prisma.user
      .update({ where: { id: customer.userId }, data: { lastBarbershopId: barbershopId } })
      .catch(() => null);

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error("[public/agendamentos]", err);
    return NextResponse.json({ error: "Erro ao criar agendamento." }, { status: 503 });
  }
}
