import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

function generateCoupon(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${base}-${suffix}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string; phone?: string };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();

    if (!name || !email) {
      return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
    }

    const existing = await db.reseller.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado como revendedor." }, { status: 409 });
    }

    // Generate unique coupon
    let couponCode = generateCoupon(name);
    let attempts = 0;
    while (await db.reseller.findUnique({ where: { couponCode } })) {
      couponCode = generateCoupon(name);
      if (++attempts > 10) couponCode = `REV-${Date.now().toString(36).toUpperCase()}`;
    }

    const reseller = await db.reseller.create({
      data: { name, email, phone: phone || null, couponCode, commissionRate: 10, status: "ACTIVE" },
    });

    return NextResponse.json({
      id: reseller.id,
      name: reseller.name,
      email: reseller.email,
      couponCode: reseller.couponCode,
      commissionRate: reseller.commissionRate,
      dashboardUrl: `/revendedor/${reseller.couponCode}`,
    }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro inesperado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
