import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: Request, { params }: { params: Promise<{ coupon: string }> }) {
  // M6: throttle por IP — dificulta enumeracao de cupons.
  if (isRateLimited(`revendedor-coupon:${getClientIp(req)}`, { limit: 20, windowMs: 60_000 })) {
    return rateLimitResponse();
  }

  const { coupon } = await params;

  const reseller = await prisma.reseller.findUnique({
    where: { couponCode: coupon.toUpperCase() },
    include: {
      referrals: {
        include: {
          barbershop: { select: { id: true, name: true, slug: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!reseller) {
    return NextResponse.json({ error: "Cupom não encontrado." }, { status: 404 });
  }

  // Este endpoint e PUBLICO (identificado apenas pelo cupom, que circula no
  // cadastro/landing). Por isso NAO expomos PII (email) nem faturamento das
  // barbearias (dado de outro tenant). A visao financeira completa fica no
  // painel SUPERADMIN, em /api/admin/revendedores (autenticado).
  return NextResponse.json({
    name: reseller.name,
    couponCode: reseller.couponCode,
    commissionRate: reseller.commissionRate,
    status: reseller.status,
    totalBarbershops: reseller.referrals.length,
    barbershops: reseller.referrals.map((r: { barbershop: { id: string; name: string; slug: string }; createdAt: string }) => ({
      id: r.barbershop.id,
      name: r.barbershop.name,
      slug: r.barbershop.slug,
      since: r.createdAt,
    })),
  });
}
