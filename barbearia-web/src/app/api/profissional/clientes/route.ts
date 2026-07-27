/**
 * GET /api/profissional/clientes?q=&scope=meus|todos
 *
 * Lista de clientes para o barbeiro. Por padrao mostra APENAS os clientes que
 * ele ja atendeu (`scope=meus`) — e o que a secao 7 pede: "o profissional
 * devera visualizar somente os dados necessarios". `scope=todos` continua
 * dentro do tenant e existe para o barbeiro achar quem vai atender agora.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { maskPhone, resolveProfessional } from "@/lib/professional-guard";

export async function GET(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const scope = searchParams.get("scope") === "todos" ? "todos" : "meus";

  try {
    const customers = await prisma.customer.findMany({
      where: {
        barbershopId: ctx.barbershopId,
        active: true,
        ...(scope === "meus"
          ? { appointments: { some: { professionalId: ctx.professionalId } } }
          : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        lastVisitAt: true,
        totalVisits: true,
        preferences: true,
      },
      orderBy: [{ lastVisitAt: "desc" }, { name: "asc" }],
      take: 100,
    });

    return NextResponse.json({
      scope,
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: maskPhone(c.phone, ctx.permissions.canViewCustomerPhone),
        lastVisitAt: c.lastVisitAt,
        totalVisits: c.totalVisits,
        // A lista nao devolve as preferencias inteiras — so avisa que existem,
        // para a tela poder marcar o cliente. Detalhe fica na ficha.
        hasPreferences: Boolean(c.preferences && Object.keys(c.preferences).length > 0),
      })),
    });
  } catch (error) {
    console.error("[profissional/clientes]", error);
    return NextResponse.json({ error: "Erro ao buscar clientes." }, { status: 503 });
  }
}
