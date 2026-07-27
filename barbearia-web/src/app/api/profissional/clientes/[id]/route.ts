/**
 * GET   /api/profissional/clientes/[id] — ficha e historico (secao 7)
 * PATCH /api/profissional/clientes/[id] — observacoes, preferencias e cadastro
 *
 * Privacidade (secao 7 / LGPD): o barbeiro ve o que precisa para atender bem —
 * historico, preferencias, frequencia — e NAO ve o que nao precisa. O telefone
 * depende de permissao; o e-mail nunca aparece, porque nao existe acao de
 * atendimento que dependa dele.
 *
 * Observacoes e preferencias sao SEMPRE editaveis: sao o registro do proprio
 * atendimento. Alterar nome, telefone ou aniversario e que exige
 * `canEditCustomer`.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { maskPhone, resolveProfessional } from "@/lib/professional-guard";
import { logAudit } from "@/lib/audit";
import {
  readPreferences,
  sanitizePreferences,
  type CustomerPreferences,
} from "@/lib/customer-preferences";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  try {
    const customer = await prisma.customer.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
      select: {
        id: true,
        name: true,
        phone: true,
        birthdate: true,
        notes: true,
        preferences: true,
        totalVisits: true,
        firstVisitAt: true,
        lastVisitAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
    }

    const now = new Date();

    const [history, nextAppointment, reviews] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          barbershopId: ctx.barbershopId,
          customerId: id,
          status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
        },
        select: {
          id: true,
          startsAt: true,
          status: true,
          notes: true,
          professional: { select: { id: true, name: true } },
          service: { select: { name: true, price: true } },
          order: {
            select: {
              id: true,
              total: true,
              status: true,
              items: { select: { name: true, quantity: true, total: true, type: true } },
            },
          },
        },
        orderBy: { startsAt: "desc" },
        take: 30,
      }),
      prisma.appointment.findFirst({
        where: {
          barbershopId: ctx.barbershopId,
          customerId: id,
          startsAt: { gte: now },
          status: { in: ["SCHEDULED", "CONFIRMED", "ARRIVED"] },
        },
        select: {
          id: true,
          startsAt: true,
          status: true,
          professional: { select: { name: true } },
          service: { select: { name: true } },
        },
        orderBy: { startsAt: "asc" },
      }),
      prisma.review.findMany({
        where: { barbershopId: ctx.barbershopId, customerId: id },
        select: { id: true, rating: true, comment: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Indicadores derivados do historico (secao 7).
    const completed = history.filter((h) => h.status === "COMPLETED");
    const noShows = history.filter((h) => h.status === "NO_SHOW").length;
    const cancellations = history.filter((h) => h.status === "CANCELLED").length;

    // Frequencia media em dias entre atendimentos concluidos.
    let averageIntervalDays: number | null = null;
    if (completed.length >= 2) {
      const first = completed[completed.length - 1].startsAt.getTime();
      const last = completed[0].startsAt.getTime();
      averageIntervalDays = Math.round(
        last === first ? 0 : (last - first) / (completed.length - 1) / 86_400_000,
      );
    }

    // Servicos mais realizados.
    const serviceCount = new Map<string, number>();
    for (const h of completed) {
      const name = h.service?.name;
      if (name) serviceCount.set(name, (serviceCount.get(name) ?? 0) + 1);
    }
    const topServices = [...serviceCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: maskPhone(customer.phone, ctx.permissions.canViewCustomerPhone),
        birthdate: customer.birthdate,
        notes: customer.notes,
        preferences: readPreferences(customer.preferences),
        totalVisits: customer.totalVisits,
        firstVisitAt: customer.firstVisitAt,
        lastVisitAt: customer.lastVisitAt,
      },
      stats: {
        completed: completed.length,
        cancellations,
        noShows,
        averageIntervalDays,
        topServices,
        totalSpent: completed.reduce((s, h) => s + Number(h.order?.total ?? 0), 0),
      },
      nextAppointment,
      history: history.map((h) => ({
        id: h.id,
        startsAt: h.startsAt,
        status: h.status,
        notes: h.notes,
        professional: h.professional?.name ?? null,
        service: h.service?.name ?? null,
        // Valor pago vem da comanda; se nao houver, cai para o preco do servico.
        total: h.order ? Number(h.order.total) : Number(h.service?.price ?? 0),
        paid: h.order?.status === "CLOSED",
        items: h.order?.items ?? [],
      })),
      reviews,
      permissions: {
        canEditCustomer: ctx.permissions.canEditCustomer,
        canViewCustomerPhone: ctx.permissions.canViewCustomerPhone,
      },
    });
  } catch (error) {
    console.error("[profissional/clientes GET]", error);
    return NextResponse.json({ error: "Erro ao carregar o cliente." }, { status: 503 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  try {
    const existing = await prisma.customer.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
      select: { id: true, name: true, phone: true, notes: true, preferences: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      notes?: string;
      preferences?: unknown;
      name?: string;
      phone?: string;
    };

    const data: Prisma.CustomerUpdateInput = {};
    /** Guardado a parte para a auditoria — o `data` ja vai no formato do Prisma. */
    let newPreferences: CustomerPreferences | undefined;

    // Sempre permitido: e o registro do atendimento.
    if ("notes" in body) data.notes = body.notes?.trim() || null;
    if ("preferences" in body) {
      newPreferences = sanitizePreferences(body.preferences);
      // `sanitizePreferences` ja garante um objeto plano de string,
      // compativel com InputJsonValue.
      data.preferences = newPreferences as Prisma.InputJsonValue;
    }

    // Cadastro: exige permissao (secao 18, "Editar cadastro do cliente").
    const wantsProfileEdit = "name" in body || "phone" in body;
    if (wantsProfileEdit) {
      if (!ctx.permissions.canEditCustomer) {
        return NextResponse.json(
          {
            error:
              "Voce pode registrar observacoes e preferencias, mas nao alterar o cadastro do cliente.",
            code: "PERMISSION_DENIED",
          },
          { status: 403 },
        );
      }
      const name = body.name?.trim();
      if ("name" in body && !name) {
        return NextResponse.json({ error: "O nome nao pode ficar vazio." }, { status: 400 });
      }
      if (name) data.name = name;
      if ("phone" in body) data.phone = body.phone?.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
      select: { id: true, name: true, phone: true, notes: true, preferences: true },
    });

    await logAudit({
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      userName: ctx.userName,
      action: wantsProfileEdit ? "customer.update" : "customer.note",
      entity: "Customer",
      entityId: id,
      before: {
        ...(wantsProfileEdit ? { name: existing.name, phone: existing.phone } : {}),
        ...("notes" in body ? { notes: existing.notes } : {}),
        ...("preferences" in body ? { preferences: existing.preferences } : {}),
      },
      after: {
        ...(wantsProfileEdit ? { name: data.name, phone: data.phone } : {}),
        ...("notes" in body ? { notes: data.notes } : {}),
        ...(newPreferences ? { preferences: newPreferences } : {}),
      },
      request,
    });

    return NextResponse.json({
      customer: {
        ...updated,
        phone: maskPhone(updated.phone, ctx.permissions.canViewCustomerPhone),
        preferences: readPreferences(updated.preferences),
      },
    });
  } catch (error) {
    console.error("[profissional/clientes PATCH]", error);
    return NextResponse.json({ error: "Erro ao salvar." }, { status: 503 });
  }
}
