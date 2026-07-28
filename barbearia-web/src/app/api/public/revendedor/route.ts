import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited, rateLimitResponse } from "@/lib/rate-limit";

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
  // M6: throttle por IP — 5 cadastros por hora.
  if (isRateLimited(`public-revendedor:${getClientIp(request)}`, { limit: 5, windowMs: 60 * 60_000 })) {
    return rateLimitResponse();
  }

  try {
    const body = await request.json() as { name?: string; email?: string; phone?: string };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();

    if (!name || !email) {
      return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
    }

    const existing = await prisma.reseller.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado como revendedor." }, { status: 409 });
    }

    // Generate unique coupon
    let couponCode = generateCoupon(name);
    let attempts = 0;
    while (await prisma.reseller.findUnique({ where: { couponCode } })) {
      couponCode = generateCoupon(name);
      if (++attempts > 10) couponCode = `REV-${Date.now().toString(36).toUpperCase()}`;
    }

    // Cadastro publico entra como PENDING: a ativacao (e o pagamento de
    // comissao) so valem apos aprovacao no painel SUPERADMIN.
    const reseller = await prisma.reseller.create({
      data: { name, email, phone: phone || null, couponCode, commissionRate: 10, status: "PENDING" },
    });

    return NextResponse.json({
      id: reseller.id,
      name: reseller.name,
      email: reseller.email,
      couponCode: reseller.couponCode,
      commissionRate: reseller.commissionRate,
      status: reseller.status,
      pendingApproval: true,
      dashboardUrl: `/revendedor/${reseller.couponCode}`,
    }, { status: 201 });
  } catch (error) {
    console.error("[public/revendedor]", error);
    return NextResponse.json({ error: "Nao foi possivel concluir o cadastro." }, { status: 500 });
  }
}
