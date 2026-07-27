/**
 * GET /api/auditoria?action=&entity=&entityId=&userId=&from=&to=&take=&skip=
 *
 * Consulta da trilha de auditoria (secao 20). Restrita a OWNER/MANAGER: o log
 * atravessa toda a barbearia — quem cancelou, quem deu desconto, quem mexeu no
 * cadastro — e a secao 23 nao coloca isso na mao do barbeiro.
 *
 * Somente leitura. Nao existe POST, PATCH nem DELETE aqui de proposito: a
 * secao 19, regra 22 exige que o historico nao seja editavel, e a unica forma
 * de garantir isso e nao oferecer a operacao.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action")?.trim();
  const entity = searchParams.get("entity")?.trim();
  const entityId = searchParams.get("entityId")?.trim();
  const userId = searchParams.get("userId")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const take = Math.min(Number(searchParams.get("take") ?? 50), 200);
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if ((fromDate && isNaN(fromDate.getTime())) || (toDate && isNaN(toDate.getTime()))) {
    return NextResponse.json({ error: "Periodo invalido." }, { status: 400 });
  }

  try {
    const where = {
      barbershopId: ctx.barbershopId,
      ...(action ? { action } : {}),
      ...(entity ? { entity } : {}),
      ...(entityId ? { entityId } : {}),
      ...(userId ? { userId } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, take, skip });
  } catch (error) {
    console.error("[auditoria]", error);
    return NextResponse.json({ error: "Erro ao carregar a auditoria." }, { status: 503 });
  }
}
