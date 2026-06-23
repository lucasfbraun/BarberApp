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
  const filter = url.searchParams.get("status") ?? "all"; // all | trial | active | inactive | expired

  const now = new Date();

  const barbershops = await db.barbershop.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      plan: { select: { id: true, name: true, price: true } },
      resellerLink: {
        include: { reseller: { select: { id: true, name: true, couponCode: true } } },
      },
      _count: {
        select: {
          professionals: true,
          services: true,
          appointments: true,
          orders: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute derived status for each barbershop
  type BarbershopRow = typeof barbershops[number] & { computedStatus: string };
  const rows: BarbershopRow[] = barbershops.map((b: typeof barbershops[number]) => {
    let computedStatus: string;
    if (b.status === "INACTIVE") {
      computedStatus = "inactive";
    } else if (b.trialEndsAt && new Date(b.trialEndsAt) < now) {
      computedStatus = "expired";
    } else if (b.trialEndsAt && !b.planId) {
      computedStatus = "trial";
    } else {
      computedStatus = "active";
    }
    return { ...b, computedStatus };
  });

  // Apply filter
  const filtered = filter === "all"
    ? rows
    : rows.filter((b) => b.computedStatus === filter);

  // Summary counts
  const summary = {
    total: rows.length,
    trial: rows.filter((b) => b.computedStatus === "trial").length,
    active: rows.filter((b) => b.computedStatus === "active").length,
    expired: rows.filter((b) => b.computedStatus === "expired").length,
    inactive: rows.filter((b) => b.computedStatus === "inactive").length,
  };

  return NextResponse.json({ summary, barbershops: filtered });
}
