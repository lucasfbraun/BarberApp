import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAdmin } from "@/lib/auth-guard";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(request: Request) {
  const adminOrError = await resolveAdmin(request);
  if (adminOrError instanceof NextResponse) return adminOrError;

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const filter = url.searchParams.get("status") ?? "all";

  const resellers = await db.reseller.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { couponCode: { contains: search, mode: "insensitive" } },
          ],
        }
      : filter !== "all"
      ? { status: filter.toUpperCase() }
      : undefined,
    include: {
      referrals: {
        include: {
          barbershop: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // For each reseller, compute revenue and commission from linked barbershops
  const enriched = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resellers.map(async (r: any) => {
      const barbershopIds = r.referrals.map((ref: { barbershopId: string }) => ref.barbershopId);
      const orders = barbershopIds.length > 0
        ? await prisma.order.findMany({
            where: { barbershopId: { in: barbershopIds }, status: "CLOSED" },
            select: { total: true },
          })
        : [];
      const totalRevenue = orders.reduce((s: number, o: { total: unknown }) => s + Number(o.total), 0);
      const totalCommission = totalRevenue * (r.commissionRate / 100);
      return { ...r, totalRevenue, totalCommission };
    }),
  );

  const filtered = filter === "all"
    ? enriched
    : enriched.filter((r: { status: string }) => r.status.toLowerCase() === filter.toLowerCase());

  const summary = {
    total: enriched.length,
    active: enriched.filter((r: { status: string }) => r.status === "ACTIVE").length,
    pending: enriched.filter((r: { status: string }) => r.status === "PENDING").length,
    inactive: enriched.filter((r: { status: string }) => r.status === "INACTIVE").length,
  };

  return NextResponse.json({ summary, resellers: filtered });
}
