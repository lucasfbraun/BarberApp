/**
 * PATCH /api/admin/revendedores/[id]
 * Ações: approve · deactivate · set_commission
 *
 * Restrito a SUPERADMIN. Aprovar um revendedor e mexer na taxa dele são
 * decisões financeiras, então cada uma valida a entrada e confere o estado
 * atual antes de escrever.
 */

import { NextResponse } from "next/server";

import { resolveAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;

  try {
    // Existência conferida antes: um id inválido virava exceção do Prisma
    // sem try/catch — 500 com stack em vez de 404.
    const existing = await prisma.reseller.findUnique({
      where: { id },
      select: { id: true, status: true, commissionRate: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Revendedor não encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as { action?: string; commissionRate?: number };

    if (body.action === "approve") {
      const updated = await prisma.reseller.update({
        where: { id },
        data: { status: "ACTIVE" },
      });
      return NextResponse.json({ status: updated.status });
    }

    if (body.action === "deactivate") {
      const updated = await prisma.reseller.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
      return NextResponse.json({ status: updated.status });
    }

    if (body.action === "set_commission") {
      const rate = Number(body.commissionRate);
      // Faixa fechada: taxa negativa cobraria do revendedor, e acima de 100%
      // pagaria mais do que a barbearia fatura. Nenhum dos dois é um erro que
      // se percebe rápido — aparece no fechamento do mês.
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: "Taxa de comissão deve estar entre 0 e 100." },
          { status: 400 },
        );
      }

      const updated = await prisma.reseller.update({
        where: { id },
        data: { commissionRate: rate },
      });
      return NextResponse.json({ commissionRate: updated.commissionRate });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("[admin/revendedores PATCH]", error);
    return NextResponse.json({ error: "Não foi possível atualizar." }, { status: 503 });
  }
}
