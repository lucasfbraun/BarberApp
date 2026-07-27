/**
 * PATCH /api/cliente/agendamentos/[id]  { action: "cancel" }
 * Cliente cancela o PROPRIO agendamento (futuro e ainda ativo).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCustomer } from "@/lib/auth-guard";

// Cast temporario ate o Prisma Client ser regenerado com Customer.userId (B2).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  try {
    const body = (await request.json()) as { action?: string };
    if (body.action !== "cancel") {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    // So agendamentos do proprio cliente (Customer.userId = usuario logado).
    const appointment = await db.appointment.findFirst({
      where: { id, customer: { userId: ctx.userId } },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });
    }

    // ARRIVED entra na lista: se o cliente ja foi marcado como presente na
    // barbearia, cancelar pelo app nao faz sentido — ele esta no salao.
    if (
      ["CANCELLED", "COMPLETED", "ARRIVED", "IN_PROGRESS", "NO_SHOW", "RESCHEDULED"].includes(
        appointment.status,
      )
    ) {
      return NextResponse.json({ error: "Este agendamento nao pode mais ser cancelado." }, { status: 400 });
    }
    if (new Date(appointment.startsAt) <= new Date()) {
      return NextResponse.json(
        { error: "O horario ja passou; fale com a barbearia." },
        { status: 400 },
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ appointment: updated });
  } catch {
    return NextResponse.json({ error: "Erro ao cancelar agendamento." }, { status: 503 });
  }
}
