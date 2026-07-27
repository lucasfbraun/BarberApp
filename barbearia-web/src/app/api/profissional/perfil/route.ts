/**
 * GET   /api/profissional/perfil — perfil do barbeiro (secao 12)
 * PATCH /api/profissional/perfil — edita o que e dele
 *
 * A secao 12 divide claramente o que cada um controla. O profissional edita a
 * apresentacao (foto, nome profissional, bio); o administrador controla o que
 * tem efeito comercial ou financeiro: servicos habilitados, precos, comissao,
 * jornada oficial e status. Por isso o PATCH aceita uma lista fechada de tres
 * campos — qualquer outro e ignorado em silencio, e nao ha como um payload
 * criativo alterar `commissionValue`.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveProfessional } from "@/lib/professional-guard";
import { logAudit, diff } from "@/lib/audit";

/** Unicos campos editaveis pelo proprio profissional. */
const EDITABLE = ["name", "bio", "photoUrl"] as const;

export async function GET(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const [professional, services, workingHours, reviewStats] = await Promise.all([
      prisma.professional.findUnique({
        where: { id: ctx.professionalId },
        select: {
          id: true,
          name: true,
          bio: true,
          photoUrl: true,
          phone: true,
          email: true,
          commissionType: true,
          commissionValue: true,
          active: true,
          createdAt: true,
        },
      }),
      prisma.professionalService.findMany({
        where: { professionalId: ctx.professionalId, active: true },
        select: {
          customPrice: true,
          customDurationMinutes: true,
          service: { select: { id: true, name: true, price: true, durationMinutes: true } },
        },
      }),
      prisma.workingHours.findMany({
        where: { professionalId: ctx.professionalId },
        orderBy: { weekday: "asc" },
      }),
      prisma.review.aggregate({
        where: { barbershopId: ctx.barbershopId, professionalId: ctx.professionalId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    if (!professional) {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      professional: {
        id: professional.id,
        name: professional.name,
        bio: professional.bio,
        photoUrl: professional.photoUrl,
        phone: professional.phone,
        email: professional.email,
        active: professional.active,
        createdAt: professional.createdAt,
        // Somente leitura: o barbeiro ve a propria regra de comissao, mas nao
        // a altera (secao 9, regra 1).
        commissionType: professional.commissionType,
        commissionValue: professional.commissionValue,
      },
      services: services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        price: Number(s.customPrice ?? s.service.price),
        durationMinutes: s.customDurationMinutes ?? s.service.durationMinutes,
      })),
      workingHours,
      rating: {
        average: reviewStats._avg.rating,
        count: reviewStats._count._all,
      },
      editableFields: EDITABLE,
    });
  } catch (error) {
    console.error("[profissional/perfil GET]", error);
    return NextResponse.json({ error: "Erro ao carregar o perfil." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const ctx = await resolveProfessional(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const existing = await prisma.professional.findUnique({
      where: { id: ctx.professionalId },
      select: { name: true, bio: true, photoUrl: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }

    const data: { name?: string; bio?: string | null; photoUrl?: string | null } = {};

    if ("name" in body) {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return NextResponse.json({ error: "O nome nao pode ficar vazio." }, { status: 400 });
      }
      data.name = name.slice(0, 120);
    }
    if ("bio" in body) {
      data.bio = String(body.bio ?? "").trim().slice(0, 1000) || null;
    }
    if ("photoUrl" in body) {
      const photo = String(body.photoUrl ?? "").trim();
      if (!photo) {
        data.photoUrl = null;
      } else {
        // Mesmo contrato do upload de logo: data URL redimensionada no
        // navegador, ou URL externa. Ver UPLOADS.md.
        const isDataUrl = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo);
        const isUrl = /^(https?:\/\/|\/)/.test(photo);
        if (!isDataUrl && !isUrl) {
          return NextResponse.json(
            { error: "Foto invalida. Envie PNG, JPG ou WebP." },
            { status: 400 },
          );
        }
        if (photo.length > 200_000) {
          return NextResponse.json(
            { error: "Foto muito grande. Envie uma versao menor." },
            { status: 400 },
          );
        }
        data.photoUrl = photo;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    const updated = await prisma.professional.update({
      where: { id: ctx.professionalId },
      data,
      select: { id: true, name: true, bio: true, photoUrl: true },
    });

    const changes = diff(
      existing as unknown as Record<string, unknown>,
      data as Record<string, unknown>,
      [...EDITABLE],
    );

    if (changes) {
      await logAudit({
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        userName: ctx.userName,
        action: "professional.profile_update",
        entity: "Professional",
        entityId: ctx.professionalId,
        // A foto vira data URL de ate 200 KB — guardar no log inflaria a
        // tabela de auditoria sem ganho nenhum. Registramos so que mudou.
        before: { ...changes.before, photoUrl: existing.photoUrl ? "[imagem]" : null },
        after: { ...changes.after, photoUrl: data.photoUrl ? "[imagem]" : null },
        request,
      });
    }

    return NextResponse.json({ professional: updated });
  } catch (error) {
    console.error("[profissional/perfil PATCH]", error);
    return NextResponse.json({ error: "Erro ao salvar o perfil." }, { status: 503 });
  }
}
