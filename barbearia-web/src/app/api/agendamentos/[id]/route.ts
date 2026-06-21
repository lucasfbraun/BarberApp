/**
 * GET   /api/agendamentos/[id]
 * PATCH /api/agendamentos/[id]  — atualiza status ou dados
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { resolveTenant } from "@/lib/auth-guard";

const VALID_STATUSES = Object.values(AppointmentStatus) as string[];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, barbershopId: ctx.barbershopId },
    include: {
      professional: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
      service: { select: { id: true, name: true, durationMinutes: true, price: true } },
      order: { select: { id: true, status: true, total: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ appointment });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const existing = await prisma.appointment.findFirst({
    where: { id, barbershopId: ctx.barbershopId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });
  }

  const body = (await request.json()) as {
    status?: string;
    notes?: string;
    cancellationReason?: string;
    startsAt?: string;
    endsAt?: string;
  };

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Status invalido." }, { status: 400 });
  }

  const now = new Date();
  const statusTimestamps: Record<string, object> = {
    CONFIRMED: { confirmedAt: now },
    COMPLETED: { completedAt: now },
    CANCELLED: { cancelledAt: now },
  };

  try {
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status as AppointmentStatus } : {}),
        ...(body.status ? (statusTimestamps[body.status] ?? {}) : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
        ...(body.cancellationReason !== undefined
          ? { cancellationReason: body.cancellationReason?.trim() ?? null }
          : {}),
        ...(body.startsAt ? { startsAt: new Date(body.startsAt) } : {}),
        ...(body.endsAt ? { endsAt: new Date(body.endsAt) } : {}),
      },
      include: {
        professional: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ appointment: updated });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar agendamento." }, { status: 503 });
  }
}
