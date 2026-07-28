/**
 * GET   /api/agendamentos/[id]
 * PATCH /api/agendamentos/[id]  — atualiza status ou dados
 *
 * Rota do PAINEL (recepcao e gestao). O barbeiro usa
 * `/api/profissional/agendamentos/[id]`, que aplica as permissoes da secao 18
 * do Portal do Profissional.
 *
 * Tres protecoes que faltavam aqui (achado N2 da analise de 27/07):
 *  1. GUARD DE PAPEL — qualquer papel do tenant, inclusive PROFESSIONAL, podia
 *     alterar QUALQUER agendamento da barbearia, enquanto o GET da lista ja
 *     restringia o profissional a propria agenda. A escrita era mais frouxa
 *     que a leitura.
 *  2. CONFLITO AO REMARCAR — mover `startsAt`/`endsAt` nao verificava
 *     sobreposicao, contornando toda a transacao serializavel do POST. Dava
 *     para criar double-booking pela porta dos fundos.
 *  3. COERENCIA DAS DATAS — nada garantia `endsAt > startsAt`, e um
 *     agendamento invertido some da agenda (a consulta filtra por intervalo).
 */

import { NextResponse } from "next/server";
import { AppointmentStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  guardRole,
  resolveOwnProfessionalId,
  resolveTenant,
  STAFF_ROLES,
} from "@/lib/auth-guard";
import { logAudit, type AuditAction } from "@/lib/audit";

const VALID_STATUSES = Object.values(AppointmentStatus) as string[];

/** Status terminais: nao voltam atras por esta rota (secao 19, regra 8). */
const FINAL_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
  AppointmentStatus.RESCHEDULED,
];

/** Papeis que podem CANCELAR pelo painel. */
const CANCEL_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.RECEPTION,
];

/** Auditoria correspondente a cada status novo. */
const AUDIT_BY_STATUS: Partial<Record<string, AuditAction>> = {
  CONFIRMED: "appointment.confirm",
  ARRIVED: "appointment.arrive",
  IN_PROGRESS: "appointment.start",
  COMPLETED: "appointment.complete",
  CANCELLED: "appointment.cancel",
  NO_SHOW: "appointment.no_show",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  try {
    // PROFESSIONAL so enxerga a propria agenda — mesma regra do GET da lista.
    let ownProfessionalId: string | null = null;
    if (ctx.role === UserRole.PROFESSIONAL) {
      ownProfessionalId = await resolveOwnProfessionalId(ctx.barbershopId, ctx.userId);
      if (!ownProfessionalId) {
        return NextResponse.json(
          { error: "Profissional nao vinculado ao usuario." },
          { status: 403 },
        );
      }
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        barbershopId: ctx.barbershopId,
        ...(ownProfessionalId ? { professionalId: ownProfessionalId } : {}),
      },
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
  } catch (error) {
    console.error("[agendamentos GET]", error);
    return NextResponse.json({ error: "Erro ao buscar agendamento." }, { status: 503 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  // Cliente final nao chega aqui; esta rota e da equipe.
  const denied = guardRole(ctx.role, STAFF_ROLES);
  if (denied) return denied;

  const { id } = await params;

  try {
    // (1) Escopo: tenant e, para o barbeiro, a propria agenda.
    let ownProfessionalId: string | null = null;
    if (ctx.role === UserRole.PROFESSIONAL) {
      ownProfessionalId = await resolveOwnProfessionalId(ctx.barbershopId, ctx.userId);
      if (!ownProfessionalId) {
        return NextResponse.json(
          { error: "Profissional nao vinculado ao usuario." },
          { status: 403 },
        );
      }
    }

    const existing = await prisma.appointment.findFirst({
      where: {
        id,
        barbershopId: ctx.barbershopId,
        ...(ownProfessionalId ? { professionalId: ownProfessionalId } : {}),
      },
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

    // Atendimento finalizado nao e reaberto por aqui. Alterar so a observacao
    // continua liberado — anotar depois do atendimento e legitimo.
    const changesStateOrTime = Boolean(body.status || body.startsAt || body.endsAt);
    if (changesStateOrTime && FINAL_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        {
          error: `Este atendimento ja esta como ${existing.status} e nao pode mais ser alterado.`,
          code: "FINAL_STATE",
        },
        { status: 409 },
      );
    }

    // Cancelar exige papel e motivo (secao 4, regra 6).
    if (body.status === AppointmentStatus.CANCELLED) {
      if (!CANCEL_ROLES.includes(ctx.role)) {
        return NextResponse.json(
          { error: "Voce nao tem permissao para cancelar atendimentos." },
          { status: 403 },
        );
      }
      if (!body.cancellationReason?.trim()) {
        return NextResponse.json(
          { error: "Informe o motivo do cancelamento." },
          { status: 400 },
        );
      }
    }

    // (2) e (3) Remarcacao: datas coerentes e conflito revalidado.
    const movesTime = Boolean(body.startsAt || body.endsAt);
    let startsAt = existing.startsAt;
    let endsAt = existing.endsAt;

    if (movesTime) {
      if (body.startsAt) {
        const parsed = new Date(body.startsAt);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ error: "startsAt invalido." }, { status: 400 });
        }
        startsAt = parsed;
      }
      if (body.endsAt) {
        const parsed = new Date(body.endsAt);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ error: "endsAt invalido." }, { status: 400 });
        }
        endsAt = parsed;
      } else if (body.startsAt) {
        // So o inicio mudou: preserva a duracao original em vez de deixar o
        // fim para tras, o que sumiria com o agendamento da agenda.
        const duration = existing.endsAt.getTime() - existing.startsAt.getTime();
        endsAt = new Date(startsAt.getTime() + duration);
      }

      if (endsAt <= startsAt) {
        return NextResponse.json(
          { error: "O fim do atendimento deve ser posterior ao inicio." },
          { status: 400 },
        );
      }
    }

    const now = new Date();
    const statusTimestamps: Record<string, object> = {
      CONFIRMED: { confirmedAt: now },
      ARRIVED: { arrivedAt: now },
      IN_PROGRESS: { startedAt: now },
      COMPLETED: { completedAt: now },
      CANCELLED: { cancelledAt: now },
    };

    const data = {
      ...(body.status ? { status: body.status as AppointmentStatus } : {}),
      ...(body.status ? (statusTimestamps[body.status] ?? {}) : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
      ...(body.cancellationReason !== undefined
        ? { cancellationReason: body.cancellationReason?.trim() ?? null }
        : {}),
      ...(movesTime
        ? {
            startsAt,
            endsAt,
            // Preserva o horario original do PRIMEIRO remanejamento.
            rescheduledFrom: existing.rescheduledFrom ?? existing.startsAt,
          }
        : {}),
    };

    const include = {
      professional: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      service: { select: { id: true, name: true } },
    };

    let updated;

    if (movesTime && existing.professionalId) {
      // Mesma protecao do POST: checagem e escrita na MESMA transacao
      // serializavel. Fora dela, duas remarcacoes simultaneas para o mesmo
      // horario passariam as duas.
      const professionalId = existing.professionalId;
      try {
        updated = await prisma.$transaction(
          async (tx) => {
            const conflict = await tx.appointment.findFirst({
              where: {
                barbershopId: ctx.barbershopId,
                professionalId,
                id: { not: id },
                status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
                AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
              },
              select: { id: true },
            });
            if (conflict) throw new Error("CONFLICT");

            return tx.appointment.update({ where: { id }, data, include });
          },
          { isolationLevel: "Serializable" },
        );
      } catch (err) {
        if (err instanceof Error && err.message === "CONFLICT") {
          return NextResponse.json(
            { error: "Conflito de horario: o profissional ja tem atendimento neste intervalo." },
            { status: 409 },
          );
        }
        // Falha de serializacao (corrida) tambem vira conflito para quem chamou.
        return NextResponse.json(
          { error: "Nao foi possivel remarcar. Tente novamente." },
          { status: 409 },
        );
      }
    } else {
      updated = await prisma.appointment.update({ where: { id }, data, include });
    }

    await logAudit({
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      action: movesTime
        ? "appointment.reschedule"
        : (AUDIT_BY_STATUS[body.status ?? ""] ?? "appointment.confirm"),
      entity: "Appointment",
      entityId: id,
      before: {
        status: existing.status,
        ...(movesTime ? { startsAt: existing.startsAt, endsAt: existing.endsAt } : {}),
      },
      after: {
        status: updated.status,
        ...(movesTime ? { startsAt, endsAt } : {}),
      },
      reason: body.cancellationReason?.trim() || null,
      request,
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("[agendamentos PATCH]", error);
    return NextResponse.json({ error: "Erro ao atualizar agendamento." }, { status: 503 });
  }
}
