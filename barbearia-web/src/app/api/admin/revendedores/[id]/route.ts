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

/**
 * Mesmo formato do cadastro público (`NOME-XXXX`), para o revendedor
 * reconhecer o próprio cupom depois de uma troca.
 */
function gerarCupom(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const sufixo = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${base || "REV"}-${sufixo}`;
}

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
      select: { id: true, status: true, commissionRate: true, name: true, couponCode: true },
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

    /**
     * Revoga o cupom SEM desativar o revendedor.
     *
     * Serve para quando o código vazou — foi publicado num grupo, virou
     * "cupom de desconto" na internet — mas a parceria continua. Gera um
     * código novo: o antigo para de funcionar na hora.
     *
     * As barbearias já indicadas NÃO são afetadas. O vínculo é por
     * `resellerId`, e o `BarbershopReseller.couponCode` guarda o código
     * usado na época, como registro histórico. A comissão continua.
     *
     * Para parar de valer sem trocar o código, use `deactivate`: desde a
     * correção de hoje, cupom de revendedor inativo não é mais aceito no
     * cadastro.
     */
    if (body.action === "revoke_coupon") {
      let novoCodigo = gerarCupom(existing.name);
      let tentativas = 0;
      while (await prisma.reseller.findUnique({ where: { couponCode: novoCodigo } })) {
        novoCodigo = gerarCupom(existing.name);
        if (++tentativas > 10) {
          novoCodigo = `REV-${Date.now().toString(36).toUpperCase()}`;
          break;
        }
      }

      const updated = await prisma.reseller.update({
        where: { id },
        data: { couponCode: novoCodigo },
        select: { couponCode: true },
      });

      return NextResponse.json({
        couponCode: updated.couponCode,
        anterior: existing.couponCode,
        aviso:
          "O código antigo parou de valer. As barbearias já indicadas continuam vinculadas.",
      });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    console.error("[admin/revendedores PATCH]", error);
    return NextResponse.json({ error: "Não foi possível atualizar." }, { status: 503 });
  }
}
