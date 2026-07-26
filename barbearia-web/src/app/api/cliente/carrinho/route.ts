/**
 * GET /api/cliente/carrinho?slug=barbearia
 *
 * "Carrinho" do cliente nesta barbearia = reservas sem pagamento:
 * - Servicos: agendamentos futuros ativos (reservam a agenda do profissional).
 * - Produtos: itens de uma comanda OPEN do cliente (encomenda), que a
 *   barbearia fecha quando ele pagar presencialmente.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCustomer } from "@/lib/auth-guard";

// Cast temporario ate o Prisma Client local ser regenerado (B2).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(request: Request) {
  const ctx = await resolveCustomer(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Informe a barbearia (slug)." }, { status: 400 });
  }

  try {
    const barbershop = await prisma.barbershop.findFirst({
      where: { slug, status: "ACTIVE" },
      select: { id: true, name: true, slug: true },
    });
    if (!barbershop) {
      return NextResponse.json({ error: "Barbearia nao encontrada." }, { status: 404 });
    }

    const [appointments, order] = await Promise.all([
      // Servicos reservados: agendamentos futuros ainda ativos.
      db.appointment.findMany({
        where: {
          barbershopId: barbershop.id,
          customer: { userId: ctx.userId },
          startsAt: { gte: new Date() },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        include: {
          professional: { select: { id: true, name: true } },
          service: { select: { id: true, name: true, price: true, durationMinutes: true } },
        },
        orderBy: { startsAt: "asc" },
      }),
      // Encomenda de produtos: comanda OPEN do cliente sem vinculo com agendamento.
      db.order.findFirst({
        where: {
          barbershopId: barbershop.id,
          status: "OPEN",
          appointmentId: null,
          customer: { userId: ctx.userId },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
      }),
    ]);

    type Appt = { service: { price: unknown } | null };
    type Item = { total: unknown };
    const servicesTotal = (appointments as Appt[]).reduce(
      (s, a) => s + Number(a.service?.price ?? 0), 0,
    );
    const productsTotal = order
      ? (order.items as Item[]).reduce((s, i) => s + Number(i.total), 0)
      : 0;

    return NextResponse.json({
      barbershop,
      appointments,
      order,
      totals: {
        services: servicesTotal,
        products: productsTotal,
        estimated: servicesTotal + productsTotal,
      },
      count: appointments.length + (order?.items.length ?? 0),
    });
  } catch {
    return NextResponse.json({ error: "Erro ao carregar o carrinho." }, { status: 503 });
  }
}
