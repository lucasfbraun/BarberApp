/**
 * PATCH /api/profissional/agendamentos/[id]
 *
 * Todas as transicoes do atendimento em uma rota, via `action` (secao 4):
 *   confirm · arrive · start · complete · cancel · no_show · reschedule · notes
 *
 * Tres garantias que justificam nao reaproveitar `/api/agendamentos/[id]`:
 *  1. O agendamento tem de ser DO PROFISSIONAL logado — nao basta ser do tenant.
 *  2. As transicoes seguem uma maquina de estados; um atendimento finalizado
 *     nao volta atras (secao 19, regra 8).
 *  3. Cancelar, reagendar e marcar falta dependem de permissao (secao 18) e
 *     entram na auditoria (secao 20).
 */

import { NextResponse } from "next/server";
import { AppointmentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { guardPermission, resolveProfessional } from "@/lib/professional-guard";
import { logAudit, type AuditAction } from "@/lib/audit";

type Action =
  | "confirm"
  | "arrive"
  | "start"
  | "complete"
  | "cancel"
  | "no_show"
  | "reschedule"
  | "notes";

/**
 * Estados a partir dos quais cada acao e valida.
 *
 * `start` aceita SCHEDULED e CONFIRMED alem de ARRIVED de proposito: na
 * pratica o barbeiro muitas vezes chama o cliente e comeca direto, sem passar
 * pelo "cliente chegou". Exigir a etapa intermediaria faria a tela mentir
 * sobre o fluxo real da barbearia.
 */
const ALLOWED_FROM: Record<Action, AppointmentStatus[]> = {
  confirm: [AppointmentStatus.SCHEDULED],
  arrive: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
  start: [
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.ARRIVED,
  ],
  complete: [AppointmentStatus.IN_PROGRESS],
  cancel: [
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.ARRIVED,
  ],
  no_show: [
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.ARRIVED,
  ],
  reschedule: [
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.ARRIVED,
  ],
  notes: [
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.ARRIVED,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
  ],
};

const ACTION_LABEL: Record<Action, string> = {
  confirm: "confirmar",
  arrive: "marcar a chegada",
  start: "iniciar",
  complete: "finalizar",
  cancel: "cancelar",
  no_show: "marcar falta",
  reschedule: "reagendar",
  notes: "anotar",
};

const AUDIT_BY_ACTION: Record<Action, AuditAction> = {
  confirm: "appointment.confirm",
  arrive: "appointment.arrive",
  start: "appointment.start",
  complete: "appointment.complete",
  cancel: "appointment.cancel",
  no_show: "appointment.no_show",
  reschedule: "appointment.reschedule",
  notes: "customer.note",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  try {
    const body = (await request.json()) as {
      action?: Action;
      reason?: string;
      notes?: string;
      startsAt?: string;
    };

    const action = body.action;
    if (!action || !(action in ALLOWED_FROM)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    // Escopo duplo: do tenant E do proprio profissional.
    const existing = await prisma.appointment.findFirst({
      where: {
        id,
        barbershopId: ctx.barbershopId,
        professionalId: ctx.professionalId,
      },
      include: { service: { select: { durationMinutes: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agendamento nao encontrado na sua agenda." },
        { status: 404 },
      );
    }

    if (!ALLOWED_FROM[action].includes(existing.status)) {
      return NextResponse.json(
        {
          error: `Nao e possivel ${ACTION_LABEL[action]} um atendimento com status ${existing.status}.`,
          code: "INVALID_TRANSITION",
        },
        { status: 409 },
      );
    }

    // ── permissoes (secao 18) ────────────────────────────────────────────────
    if (action === "cancel") {
      const denied = guardPermission(
        ctx,
        "canCancelAppointment",
        "Voce nao tem permissao para cancelar. Fale com a recepcao.",
      );
      if (denied) return denied;
    }
    if (action === "reschedule") {
      const denied = guardPermission(ctx, "canReschedule");
      if (denied) return denied;
    }

    const now = new Date();

    // ── reagendamento: conflito revalidado dentro da transacao ───────────────
    if (action === "reschedule") {
      if (!body.startsAt) {
        return NextResponse.json({ error: "Informe o novo horario." }, { status: 400 });
      }
      const startsAt = new Date(body.startsAt);
      if (isNaN(startsAt.getTime())) {
        return NextResponse.json({ error: "Horario invalido." }, { status: 400 });
      }
      if (startsAt < now) {
        return NextResponse.json(
          { error: "Nao e possivel reagendar para o passado." },
          { status: 400 },
        );
      }

      const durationMinutes = Math.max(
        5,
        Math.round((existing.endsAt.getTime() - existing.startsAt.getTime()) / 60_000) ||
          existing.service?.durationMinutes ||
          30,
      );
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

      try {
        const updated = await prisma.$transaction(
          async (tx) => {
            const conflict = await tx.appointment.findFirst({
              where: {
                barbershopId: ctx.barbershopId,
                professionalId: ctx.professionalId,
                id: { not: id },
                status: { notIn: ["CANCELLED", "NO_SHOW", "RESCHEDULED"] },
                AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
              },
              select: { id: true },
            });
            if (conflict) throw new Error("CONFLICT");

            // Encaixe ignora bloqueio; sem a permissao, o bloqueio vale
            // (secao 4, regra 3).
            if (!ctx.permissions.canCreateWalkIn) {
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

            return tx.appointment.update({
              where: { id },
              data: {
                startsAt,
                endsAt,
                // Preserva o horario original apenas do PRIMEIRO reagendamento
                // (secao 4, regra 5) — sobrescrever perderia a referencia.
                rescheduledFrom: existing.rescheduledFrom ?? existing.startsAt,
                status: AppointmentStatus.SCHEDULED,
                confirmedAt: null,
                arrivedAt: null,
              },
              include: {
                customer: { select: { id: true, name: true } },
                service: { select: { id: true, name: true } },
              },
            });
          },
          { isolationLevel: "Serializable" },
        );

        await logAudit({
          barbershopId: ctx.barbershopId,
          userId: ctx.userId,
          userName: ctx.userName,
          action: "appointment.reschedule",
          entity: "Appointment",
          entityId: id,
          before: { startsAt: existing.startsAt, endsAt: existing.endsAt },
          after: { startsAt, endsAt },
          reason: body.reason?.trim() || null,
          request,
        });

        return NextResponse.json({ appointment: updated });
      } catch (err) {
        if (err instanceof Error && err.message === "CONFLICT") {
          return NextResponse.json(
            { error: "Voce ja tem atendimento neste horario." },
            { status: 409 },
          );
        }
        if (err instanceof Error && err.message === "BLOCKED") {
          return NextResponse.json(
            { error: "Este horario esta bloqueado na sua agenda." },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { error: "Nao foi possivel reagendar. Tente novamente." },
          { status: 409 },
        );
      }
    }

    // ── demais acoes: atualizacao direta de status/carimbo ───────────────────
    // Tipado com `Prisma.AppointmentUpdateInput` (e nao `object`) para que um
    // campo escrito errado quebre na compilacao, nao em producao.
    const dataByAction: Record<
      Exclude<Action, "reschedule">,
      Prisma.AppointmentUpdateInput
    > = {
      confirm: { status: AppointmentStatus.CONFIRMED, confirmedAt: now },
      arrive: { status: AppointmentStatus.ARRIVED, arrivedAt: now },
      start: { status: AppointmentStatus.IN_PROGRESS, startedAt: now },
      complete: { status: AppointmentStatus.COMPLETED, completedAt: now },
      cancel: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason: body.reason?.trim() || null,
      },
      no_show: { status: AppointmentStatus.NO_SHOW, cancelledAt: now },
      notes: { notes: body.notes?.trim() || null },
    };

    if (action === "cancel" && !body.reason?.trim()) {
      // Secao 4, regra 6: cancelamento registra data, horario, usuario e motivo.
      return NextResponse.json(
        { error: "Informe o motivo do cancelamento." },
        { status: 400 },
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: dataByAction[action],
      include: {
        customer: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, durationMinutes: true, price: true } },
        order: { select: { id: true, status: true } },
      },
    });

    await logAudit({
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      userName: ctx.userName,
      action: AUDIT_BY_ACTION[action],
      entity: "Appointment",
      entityId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      reason: body.reason?.trim() || null,
      request,
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("[profissional/agendamentos PATCH]", error);
    return NextResponse.json({ error: "Erro ao atualizar o atendimento." }, { status: 503 });
  }
}
