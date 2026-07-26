import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveTenant, guardRole, MANAGER_ROLES } from "@/lib/auth-guard";

type ThemePayload = {
  name?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
};

/**
 * Imagem aceita em dois formatos:
 *  - data URL de png/jpeg/webp (upload redimensionado no navegador);
 *  - URL http(s) ou caminho absoluto (marca hospedada em outro lugar).
 *
 * O teto existe porque a imagem vai para uma coluna do Postgres — o
 * navegador ja limita, mas a API nao pode confiar no cliente. Ver UPLOADS.md.
 */
const DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_IMAGE_CHARS = 200_000;

function sanitizeImage(
  value: string | undefined,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = value?.trim();
  if (!trimmed) return { ok: true, value: null };

  if (trimmed.startsWith("data:")) {
    if (trimmed.length > MAX_IMAGE_CHARS) {
      return { ok: false, error: `${label}: imagem muito grande. Envie uma versao menor.` };
    }
    if (!DATA_URL_PATTERN.test(trimmed)) {
      return { ok: false, error: `${label}: formato invalido. Use PNG, JPG ou WebP.` };
    }
    return { ok: true, value: trimmed };
  }

  if (!/^(https?:\/\/|\/)/.test(trimmed)) {
    return { ok: false, error: `${label}: informe uma URL comecando com https://` };
  }
  if (trimmed.length > 2048) {
    return { ok: false, error: `${label}: URL muito longa.` };
  }

  return { ok: true, value: trimmed };
}

async function resolveBarbershop(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const barbershopId = token?.activeBarbershopId as string | undefined;

  if (!barbershopId) {
    return null;
  }

  const barbershop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
  });

  return barbershop;
}

export async function GET(request: Request) {
  try {
    const barbershop = await resolveBarbershop(request);

    if (!barbershop) {
      return NextResponse.json({ error: "Tenant nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ barbershop });
  } catch {
    return NextResponse.json({ error: "Banco de dados indisponivel no momento." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    // Alterar marca/identidade e restrito a OWNER/MANAGER (escopo M2).
    const ctx = await resolveTenant(request);
    if (ctx instanceof NextResponse) return ctx;
    const guard = guardRole(ctx.role, MANAGER_ROLES);
    if (guard) return guard;

    const barbershop = await prisma.barbershop.findUnique({ where: { id: ctx.barbershopId } });

    if (!barbershop) {
      return NextResponse.json({ error: "Tenant nao encontrado." }, { status: 404 });
    }

    const payload = (await request.json()) as ThemePayload;

    const logo = sanitizeImage(payload.logoUrl, "Logo");
    if (!logo.ok) return NextResponse.json({ error: logo.error }, { status: 400 });

    const cover = sanitizeImage(payload.coverImageUrl, "Imagem de capa");
    if (!cover.ok) return NextResponse.json({ error: cover.error }, { status: 400 });

    const updated = await prisma.barbershop.update({
      where: { id: barbershop.id },
      data: {
        name: payload.name?.trim() || barbershop.name,
        description: payload.description?.trim() || null,
        logoUrl: logo.value,
        coverImageUrl: cover.value,
        primaryColor: payload.primaryColor?.trim() || null,
        secondaryColor: payload.secondaryColor?.trim() || null,
        accentColor: payload.accentColor?.trim() || null,
        backgroundColor: payload.backgroundColor?.trim() || null,
        textColor: payload.textColor?.trim() || null,
        borderRadius: payload.borderRadius?.trim() || null,
        fontFamily: payload.fontFamily?.trim() || null,
      },
    });

    return NextResponse.json({ barbershop: updated });
  } catch {
    return NextResponse.json({ error: "Banco de dados indisponivel no momento." }, { status: 503 });
  }
}
