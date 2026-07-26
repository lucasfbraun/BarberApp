/**
 * GET /api/public/barbearias?q=&city=
 * Diretorio publico de barbearias ATIVAS (busca por nome, cidade ou slug).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (isRateLimited(`public-barbearias:${getClientIp(request)}`, { limit: 60, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const city = searchParams.get("city")?.trim();

  try {
    const barbershops = await prisma.barbershop.findMany({
      where: {
        status: "ACTIVE",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        coverImageUrl: true,
        city: true,
        state: true,
        phone: true,
        whatsapp: true,
        primaryColor: true,
      },
      orderBy: { name: "asc" },
      take: 60,
    });

    return NextResponse.json({ barbershops });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar barbearias." }, { status: 503 });
  }
}
