/**
 * PATCH  /api/admin/planos/[id]
 * DELETE /api/admin/planos/[id]
 *
 * Restrito a SUPERADMIN. O plano define o que a barbearia paga e ate quantos
 * profissionais ela cadastra — por isso a entrada e validada campo a campo em
 * vez de repassada em bloco.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;

  try {
    const existing = await prisma.plan.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Antes, os campos permitidos eram copiados sem checar o TIPO: um `price`
    // como string ou um `maxProfessionals` negativo entrava no banco e só
    // aparecia depois, na cobrança.
    const data: Prisma.PlanUpdateInput = {};

    if ("name" in body) {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return NextResponse.json({ error: "O nome não pode ficar vazio." }, { status: 400 });
      }
      data.name = name;
    }

    if ("slug" in body) {
      const slug = String(body.slug ?? "").trim().toLowerCase();
      if (!SLUG_PATTERN.test(slug)) {
        return NextResponse.json(
          { error: "Slug inválido. Use letras minúsculas, números e hifens." },
          { status: 400 },
        );
      }
      const duplicate = await prisma.plan.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Já existe um plano com este slug." }, { status: 409 });
      }
      data.slug = slug;
    }

    if ("description" in body) {
      data.description = String(body.description ?? "").trim() || null;
    }

    if ("price" in body) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: "Preço inválido." }, { status: 400 });
      }
      data.price = price;
    }

    if ("maxProfessionals" in body) {
      const max = Number(body.maxProfessionals);
      // -1 é o valor combinado para "ilimitado".
      if (!Number.isInteger(max) || (max < 0 && max !== -1)) {
        return NextResponse.json(
          { error: "Limite de profissionais inválido (use -1 para ilimitado)." },
          { status: 400 },
        );
      }
      data.maxProfessionals = max;
    }

    if ("features" in body) {
      if (!Array.isArray(body.features) || body.features.some((f) => typeof f !== "string")) {
        return NextResponse.json(
          { error: "Features deve ser uma lista de textos." },
          { status: 400 },
        );
      }
      data.features = body.features as Prisma.InputJsonValue;
    }

    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json({ error: "isActive inválido." }, { status: 400 });
      }
      data.isActive = body.isActive;
    }

    if ("highlighted" in body) {
      if (typeof body.highlighted !== "boolean") {
        return NextResponse.json({ error: "highlighted inválido." }, { status: 400 });
      }
      data.highlighted = body.highlighted;
    }

    if ("displayOrder" in body) {
      const order = Number(body.displayOrder);
      if (!Number.isInteger(order)) {
        return NextResponse.json({ error: "Ordem inválida." }, { status: 400 });
      }
      data.displayOrder = order;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    /* "Mais popular" é exclusivo: marcar um tem que desmarcar o resto, senão
       a landing mostraria dois selos e o destaque perderia o sentido. As duas
       escritas vão na mesma transação. */
    if (data.highlighted === true) {
      const plan = await prisma.$transaction(async (tx) => {
        await tx.plan.updateMany({
          where: { highlighted: true, NOT: { id } },
          data: { highlighted: false },
        });
        return tx.plan.update({ where: { id }, data });
      });
      return NextResponse.json(plan);
    }

    const plan = await prisma.plan.update({ where: { id }, data });
    return NextResponse.json(plan);
  } catch (error) {
    console.error("[admin/planos PATCH]", error);
    return NextResponse.json({ error: "Não foi possível atualizar o plano." }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;

  try {
    const plan = await prisma.plan.findUnique({
      where: { id },
      select: { id: true, _count: { select: { barbershops: true } } },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
    }

    // Desvincular e apagar precisam acontecer juntos: se o delete falhasse
    // depois do updateMany, as barbearias ficariam sem plano E o plano
    // continuaria lá — o pior dos dois mundos.
    await prisma.$transaction(async (tx) => {
      await tx.barbershop.updateMany({ where: { planId: id }, data: { planId: null } });
      await tx.plan.delete({ where: { id } });
    });

    return NextResponse.json({
      ok: true,
      // Quem apagou precisa saber quantas barbearias ficaram sem plano —
      // elas voltam a ser avaliadas pelo trial.
      unlinkedBarbershops: plan._count.barbershops,
    });
  } catch (error) {
    console.error("[admin/planos DELETE]", error);
    return NextResponse.json({ error: "Não foi possível excluir o plano." }, { status: 503 });
  }
}
