/**
 * GET /api/public/barbershop/[slug]
 * Rota pública — sem autenticação.
 * Retorna dados da barbearia, serviços ativos e profissionais ativos.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const barbershop = await prisma.barbershop.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      accentColor: true,
      logoUrl: true,
      services: {
        where: { active: true },
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          price: true,
          category: { select: { name: true } },
          professionals: {
            where: { active: true },
            select: { professionalId: true },
          },
        },
        orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      },
      professionals: {
        where: { active: true },
        select: {
          id: true,
          name: true,
          bio: true,
          avatarUrl: true,
          displayOrder: true,
          services: {
            where: { active: true },
            select: { serviceId: true },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!barbershop) {
    return NextResponse.json({ error: "Barbearia não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ barbershop });
}
