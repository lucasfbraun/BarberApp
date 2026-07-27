/**
 * POST /api/profissional/agendamentos
 * O barbeiro cria um agendamento na PROPRIA agenda (secao 4).
 *
 * `walkIn: true` marca um encaixe: ignora a grade de horarios livres e os
 * bloqueios, mas NUNCA ignora a sobreposicao com outro atendimento — dois
 * clientes no mesmo horario nao e encaixe, e erro (secao 19, regra 6).
 */

import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { guardPermission, resolveProfessional } from "@/lib/professional-guard";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardPermission(ctx, "canCreateAppointment");
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      serviceId?: string;
      startsAt?: string;
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      notes?: string;
      walkIn?: boolean;
    };

    if (!body.serviceId || !body.startsAt) {
      return NextResponse.json(
        { error: "Informe o servico e o horario." },
        { status: 400 },
      );
    }

    const startsAt = new Date(body.startsAt);
    if (isNaN(startsAt.getTime())) {
      return NextResponse.json({ error: "Horario invalido." }, { status: 400 });
    }
    if (startsAt < new Date()) {
      return NextResponse.json(
        { error: "Nao e possivel agendar no passado." },
        { status: 400 },
      );
    }

    const walkIn = body.walkIn === true;
    if (walkIn) {
      const deniedWalkIn = guardPermission(
        ctx,
        "canCreateWalkIn",
        "Voce nao tem permissao para criar encaixe.",
      );
      if (deniedWalkIn) return deniedWalkIn;
    }

    // O servico precisa ser do tenant E estar habilitado para este
    // profissional (secao 6, regra 8).
    const service = await prisma.service.findFirst({
      where: { id: body.serviceId, barbershopId: ctx.barbershopId, active: true },
      select: { id: true, name: true, durationMinutes: true },
    });
    if (!service) {
      return NextResponse.json({ error: "Servico nao encontrado." }, { status: 404 });
    }

    const link = await prisma.professionalService.findFirst({
      where: { professionalId: ctx.professionalId, serviceId: service.id, active: true },
      select: { customDurationMinutes: true },
    });
    if (!link) {
      return NextResponse.json(
        { error: "Este servico nao esta habilitado para voce." },
        { status: 403 },
      );
    }

    const durationMinutes = link.customDurationMinutes ?? service.durationMinutes;
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    // Cliente: por id existente, ou criado a partir do nome informado.
    let customerId: string | null = null;
    if (body.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: body.customerId, barbershopId: ctx.barbershopId },
        select: { id: true },
      });
      if (!customer) {
        return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
      }
      customerId = customer.id;
    } else if (body.customerName?.trim()) {
      const phone = body.customerPhone?.trim() || null;
      const existing = phone
        ? await prisma.customer.findFirst({
            where: { barbershopId: ctx.barbershopId, phone },
            select: { id: true },
          })
        : null;

      customerId =
        existing?.id ??
        (
          await prisma.customer.create({
            data: {
              barbershopId: ctx.barbershopId,
              name: body.customerName.trim(),
              phone,
              firstVisitAt: startsAt,
              lastVisitAt: startsAt,
            },
            select: { id: true },
          })
        ).id;
    } else {
      return NextResponse.json({ error: "Informe o cliente." }, { status: 400 });
    }

    let appointment;
    try {
      appointment = await prisma.$transaction(
        async (tx) => {
          const conflict = await tx.appointment.findFirst({
            where: {
              barbershopId: ctx.barbershopId,
              professionalId: ctx.professionalId,
              status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
              AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
            },
            select: { id: true },
          });
          if (conflict) throw new Error("CONFLICT");

          if (!walkIn) {
            const blocked = await tx.scheduleBlock.findFirst({
              where: {
                barbershopId: ctx.barbershopId,
                OR: [{ professionalId: ctx.professionalId }, { professionalId: null }],
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
              },
              select: { id: true },
            });
            if (blocked) throw new Error("BLOCKED");
          }

          return tx.appointment.create({
            data: {
              barbershopId: ctx.barbershopId,
              professionalId: ctx.professionalId,
              serviceId: service.id,
              customerId,
              startsAt,
              endsAt,
              status: AppointmentStatus.CONFIRMED,
              source: walkIn ? "professional_walk_in" : "professional",
              notes: body.notes?.trim() || null,
              confirmedAt: new Date(),
            },
            include: {
              customer: { select: { id: true, name: true } },
              service: { select: { id: true, name: true, durationMinutes: true } },
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (err) {
      if (err instanceof Error && err.message === "CONFLICT") {
        return NextResponse.json(
          { error: "Voce ja tem atendimento neste horario." },
          { status: 409 },
        );
      }
      if (err instanceof Error && err.message === "BLOCKED") {
        return NextResponse.json(
          { error: "Este horario esta bloqueado. Use encaixe se for o caso." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Nao foi possivel criar o agendamento." },
        { status: 409 },
      );
    }

    await logAudit({
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      userName: ctx.userName,
      action: "appointment.create",
      entity: "Appointment",
      entityId: appointment.id,
      after: { startsAt, endsAt, serviceId: service.id, customerId, walkIn },
      request,
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("[profissional/agendamentos POST]", error);
    return NextResponse.json({ error: "Erro ao criar o agendamento." }, { status: 503 });
  }
}
