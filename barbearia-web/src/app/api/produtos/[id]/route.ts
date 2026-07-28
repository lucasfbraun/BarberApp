/**
 * GET    /api/produtos/[id] — detalhe com ultimas movimentacoes.
 * PATCH  /api/produtos/[id] — editar (OWNER/MANAGER; custo so aqui).
 * DELETE /api/produtos/[id] — excluir; vira soft-delete (active=false) se houver historico.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  guardRole,
  MANAGER_ROLES,
  OPERATION_ROLES,
  resolveTenant,
} from "@/lib/auth-guard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = guardRole(ctx.role, OPERATION_ROLES);
  if (denied) return denied;

  const { id } = await params;

  try {
    const product = await prisma.product.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
      include: {
        movements: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar produto." }, { status: 503 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { id } = await params;

  try {
    const existing = await prisma.product.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      sku?: string | null;
      category?: string | null;
      unit?: string;
      costPrice?: number;
      salePrice?: number;
      minStock?: number;
      expiresAt?: string | null;
      sellable?: boolean;
      active?: boolean;
    };

    if (
      (body.costPrice != null && body.costPrice < 0) ||
      (body.salePrice != null && body.salePrice < 0) ||
      (body.minStock != null && (body.minStock < 0 || !Number.isInteger(body.minStock)))
    ) {
      return NextResponse.json({ error: "Valores nao podem ser negativos." }, { status: 400 });
    }

    const sku = body.sku === undefined ? undefined : body.sku?.trim() || null;
    if (sku) {
      const dup = await prisma.product.findFirst({
        where: { barbershopId: ctx.barbershopId, sku, id: { not: id } },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json({ error: "Ja existe um produto com este SKU." }, { status: 409 });
      }
    }

    let expiresAt: Date | null | undefined = undefined;
    if (body.expiresAt !== undefined) {
      expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      if (expiresAt && isNaN(expiresAt.getTime())) {
        return NextResponse.json({ error: "Data de validade invalida." }, { status: 400 });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(sku !== undefined ? { sku } : {}),
        ...(body.category !== undefined ? { category: body.category?.trim() || null } : {}),
        ...(body.unit !== undefined ? { unit: body.unit?.trim() || "un" } : {}),
        ...(body.costPrice !== undefined ? { costPrice: body.costPrice } : {}),
        ...(body.salePrice !== undefined ? { salePrice: body.salePrice } : {}),
        ...(body.minStock !== undefined ? { minStock: body.minStock } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(body.sellable !== undefined ? { sellable: body.sellable } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });

    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar produto." }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { id } = await params;

  try {
    const existing = await prisma.product.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
      include: { _count: { select: { movements: true, orderItems: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
    }

    // Com historico (movimentacoes/vendas), nao apagamos: desativamos,
    // preservando auditoria e relatorios. Sem historico, exclui de vez.
    if (existing._count.movements > 0 || existing._count.orderItems > 0) {
      await prisma.product.update({ where: { id }, data: { active: false } });
      return NextResponse.json({ ok: true, softDeleted: true });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true, softDeleted: false });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir produto." }, { status: 503 });
  }
}
