import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(_req: Request, { params }: { params: Promise<{ coupon: string }> }) {
  const { coupon } = await params;

  const reseller = await db.reseller.findUnique({
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

  const totalBarbershops = reseller.referrals.length;

  // Estimate commissions: sum closed orders revenue * commissionRate for each barbershop linked
  const barbershopIds = reseller.referrals.map((r: { barbershopId: string }) => r.barbershopId);
  const orders = barbershopIds.length > 0
    ? await prisma.order.findMany({
        where: { barbershopId: { in: barbershopIds }, status: "CLOSED" },
        select: { total: true, barbershopId: true },
      })
    : [];

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const totalCommission = totalRevenue * (reseller.commissionRate / 100);

  return NextResponse.json({
    name: reseller.name,
    email: reseller.email,
    couponCode: reseller.couponCode,
    commissionRate: reseller.commissionRate,
    status: reseller.status,
    totalBarbershops,
    totalRevenue,
    totalCommission,
    barbershops: reseller.referrals.map((r: { barbershop: { id: string; name: string; slug: string }; barbershopId: string; createdAt: string }) => ({
      id: r.barbershop.id,
      name: r.barbershop.name,
      slug: r.barbershop.slug,
      since: r.createdAt,
      revenue: orders.filter((o) => o.barbershopId === r.barbershopId).reduce((s, o) => s + Number(o.total), 0),
    })),
  });
}
