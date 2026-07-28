/**
 * GET /api/public/barbershop/[slug]
 * Rota pública — sem autenticação.
 * Retorna dados da barbearia (detalhes), serviços ativos, profissionais
 * ativos, produtos à venda e avaliações (com média).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const barbershop = await prisma.barbershop.findFirst({
    where: { slug, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      primaryColor: true,
      accentColor: true,
      logoUrl: true,
      coverImageUrl: true,
      phone: true,
      whatsapp: true,
      email: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
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
          photoUrl: true,
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

  // Produtos à venda (vitrine) e avaliações — consultas separadas.
  const [products, reviews] = await Promise.all([
    prisma.product.findMany({
      where: { barbershopId: barbershop.id, active: true, sellable: true },
      select: {
        id: true, name: true, description: true, category: true,
        salePrice: true, stockQuantity: true, unit: true,
      },
      orderBy: { name: "asc" },
      take: 60,
    }).catch(() => []),
    prisma.review.findMany({
      where: { barbershopId: barbershop.id },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        customer: { select: { name: true } },
        professional: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }).catch(() => []),
  ]);

  type ReviewRow = { rating: number };
  const ratingAverage = reviews.length > 0
    ? (reviews as ReviewRow[]).reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return NextResponse.json({
    barbershop: {
      ...barbershop,
      products,
      reviews,
      ratingAverage,
      reviewCount: reviews.length,
    },
  });
}
