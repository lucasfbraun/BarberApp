/**
 * POST   /api/profissionais/[id]/acesso — cria ou atualiza o login do barbeiro
 * DELETE /api/profissionais/[id]/acesso — revoga o acesso (mantem o historico)
 *
 * Resolve o que impedia o Portal do Profissional de existir: ate aqui,
 * `BarbershopUser` so era criado no onboarding (sempre OWNER) e nada preenchia
 * `Professional.userId` — o vinculo que `resolveProfessional` usa para saber
 * qual barbeiro e o usuario logado.
 *
 * Escolha de fluxo: o gestor define uma senha inicial, em vez de convite por
 * e-mail. O projeto nao tem provedor de e-mail configurado, e um convite que
 * nao chega e pior do que nenhum convite. O convite por token fica registrado
 * como fase 2 (E2 do cronograma).
 */

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { id } = await params;

  try {
    const professional = await prisma.professional.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
      select: { id: true, name: true, userId: true, email: true },
    });

    if (!professional) {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.toString();

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Informe um e-mail valido." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "A senha inicial deve ter pelo menos 8 caracteres." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        active: true,
        memberships: { select: { barbershopId: true, role: true, active: true } },
      },
    });

    // Um e-mail ja usado em OUTRA barbearia nao pode ser reaproveitado: o
    // modelo atual liga um usuario a um tenant ativo por vez, entao vincula-lo
    // aqui tiraria o acesso dele de la sem ninguem perceber.
    if (existingUser) {
      const outsideMembership = existingUser.memberships.find(
        (m) => m.barbershopId !== ctx.barbershopId && m.active,
      );
      if (outsideMembership) {
        return NextResponse.json(
          { error: "Este e-mail ja tem acesso a outra barbearia. Use outro endereco." },
          { status: 409 },
        );
      }

      // Se o usuario ja e OWNER/MANAGER aqui, nao rebaixamos o papel dele —
      // o dono que tambem atende continua dono. So criamos o vinculo com o
      // registro de profissional.
      const localMembership = existingUser.memberships.find(
        (m) => m.barbershopId === ctx.barbershopId,
      );
      const keepsHigherRole =
        localMembership?.role === UserRole.OWNER || localMembership?.role === UserRole.MANAGER;

      // O profissional so pode estar vinculado a um usuario, e vice-versa.
      const takenBy = await prisma.professional.findFirst({
        where: {
          barbershopId: ctx.barbershopId,
          userId: existingUser.id,
          NOT: { id: professional.id },
        },
        select: { id: true, name: true },
      });
      if (takenBy) {
        return NextResponse.json(
          { error: `Este e-mail ja e o acesso de ${takenBy.name}.` },
          { status: 409 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { passwordHash, active: true },
        });

        await tx.barbershopUser.upsert({
          where: {
            barbershopId_userId: { barbershopId: ctx.barbershopId, userId: existingUser.id },
          },
          create: {
            barbershopId: ctx.barbershopId,
            userId: existingUser.id,
            role: UserRole.PROFESSIONAL,
          },
          update: {
            active: true,
            ...(keepsHigherRole ? {} : { role: UserRole.PROFESSIONAL }),
          },
        });

        await tx.professional.update({
          where: { id: professional.id },
          data: { userId: existingUser.id, email },
        });
      });

      await logAudit({
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        action: "professional.access_grant",
        entity: "Professional",
        entityId: professional.id,
        after: { email, linkedUserId: existingUser.id, reusedExistingUser: true },
        request,
      });

      return NextResponse.json({
        ok: true,
        email,
        reusedExistingUser: true,
        message: `Acesso vinculado a conta existente de ${existingUser.name}.`,
      });
    }

    // Caminho novo: cria usuario, vinculo e ligacao com o profissional.
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: professional.name, email, passwordHash },
        select: { id: true },
      });

      await tx.barbershopUser.create({
        data: {
          barbershopId: ctx.barbershopId,
          userId: user.id,
          role: UserRole.PROFESSIONAL,
        },
      });

      await tx.professional.update({
        where: { id: professional.id },
        data: { userId: user.id, email },
      });

      return user;
    });

    await logAudit({
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      action: "professional.access_grant",
      entity: "Professional",
      entityId: professional.id,
      after: { email, linkedUserId: created.id, reusedExistingUser: false },
      request,
    });

    return NextResponse.json({ ok: true, email, reusedExistingUser: false }, { status: 201 });
  } catch (error) {
    console.error("[profissionais/acesso POST]", error);
    return NextResponse.json({ error: "Nao foi possivel criar o acesso." }, { status: 503 });
  }
}

/**
 * Revoga o acesso. Desativa o vinculo e desfaz a ligacao com o profissional,
 * mas NAO apaga o usuario nem o historico de atendimentos — secao 19, regra 17.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  const { id } = await params;

  try {
    const professional = await prisma.professional.findFirst({
      where: { id, barbershopId: ctx.barbershopId },
      select: { id: true, userId: true, name: true },
    });

    if (!professional) {
      return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
    }
    if (!professional.userId) {
      return NextResponse.json({ error: "Este profissional nao tem acesso." }, { status: 400 });
    }

    // Guarda-corpo: revogar o proprio acesso trancaria o gestor para fora.
    if (professional.userId === ctx.userId) {
      return NextResponse.json(
        { error: "Voce nao pode revogar o proprio acesso." },
        { status: 400 },
      );
    }

    const revokedUserId = professional.userId;

    await prisma.$transaction(async (tx) => {
      await tx.barbershopUser.updateMany({
        where: { barbershopId: ctx.barbershopId, userId: revokedUserId },
        data: { active: false },
      });
      await tx.professional.update({
        where: { id: professional.id },
        data: { userId: null },
      });
    });

    await logAudit({
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      action: "professional.access_revoke",
      entity: "Professional",
      entityId: professional.id,
      before: { linkedUserId: revokedUserId },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[profissionais/acesso DELETE]", error);
    return NextResponse.json({ error: "Nao foi possivel revogar o acesso." }, { status: 503 });
  }
}
