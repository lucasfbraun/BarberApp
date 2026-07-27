/**
 * GET   /api/permissoes — permissoes vigentes do papel PROFESSIONAL
 * PATCH /api/permissoes — gestor altera as permissoes (secao 18)
 *
 * Uma linha por barbearia. A ausencia de linha significa "padroes
 * recomendados", resolvido em `lib/permissions.ts` — por isso o PATCH usa
 * upsert e nunca precisa de um passo de criacao.
 */

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardRole, MANAGER_ROLES, resolveTenant } from "@/lib/auth-guard";
import { logAudit, diff } from "@/lib/audit";
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_KEYS,
  getPermissions,
  sanitizePermissionPayload,
  type ProfessionalPermissions,
} from "@/lib/permissions";

export async function GET(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  // Qualquer membro da equipe pode LER as permissoes vigentes — o portal
  // precisa delas para esconder botoes que a API vai negar de qualquer forma.
  const permissions = await getPermissions(ctx.barbershopId);

  return NextResponse.json({
    permissions,
    defaults: DEFAULT_PERMISSIONS,
    canEdit: MANAGER_ROLES.includes(ctx.role),
  });
}

export async function PATCH(request: Request) {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  const denied = guardRole(ctx.role, MANAGER_ROLES);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch = sanitizePermissionPayload(body);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "Nenhuma permissao valida informada." },
        { status: 400 },
      );
    }

    const before = await getPermissions(ctx.barbershopId);

    const saved = await prisma.barbershopPermissions.upsert({
      where: { barbershopId: ctx.barbershopId },
      create: {
        barbershopId: ctx.barbershopId,
        ...DEFAULT_PERMISSIONS,
        ...patch,
        updatedById: ctx.userId,
      },
      update: { ...patch, updatedById: ctx.userId },
    });

    const changes = diff(
      before as unknown as Record<string, unknown>,
      patch as Record<string, unknown>,
      PERMISSION_KEYS as unknown as string[],
    );

    if (changes) {
      await logAudit({
        barbershopId: ctx.barbershopId,
        userId: ctx.userId,
        action: "permissions.update",
        entity: "BarbershopPermissions",
        entityId: ctx.barbershopId,
        before: changes.before,
        after: changes.after,
        request,
      });
    }

    const permissions: ProfessionalPermissions = {
      canViewOthersAgenda: saved.canViewOthersAgenda,
      canCreateAppointment: saved.canCreateAppointment,
      canReschedule: saved.canReschedule,
      canCancelAppointment: saved.canCancelAppointment,
      canCreateWalkIn: saved.canCreateWalkIn,
      canBlockSchedule: saved.canBlockSchedule,
      canViewCustomerPhone: saved.canViewCustomerPhone,
      canEditCustomer: saved.canEditCustomer,
      maxDiscountPercent: saved.maxDiscountPercent,
      canReceivePayment: saved.canReceivePayment,
      canViewTeamRanking: saved.canViewTeamRanking,
    };

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("[permissoes PATCH]", error);
    return NextResponse.json({ error: "Nao foi possivel salvar." }, { status: 503 });
  }
}
