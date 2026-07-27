/**
 * Contexto do PROFISSIONAL logado — base de todas as rotas /api/profissional/*.
 *
 * Resolve, em uma chamada: tenant valido (reaproveitando `resolveTenant`, que
 * ja revalida vinculo, status da barbearia e trial no banco), qual registro
 * `Professional` pertence ao usuario e quais permissoes valem para ele.
 *
 * DONO QUE TAMBEM ATENDE
 * O caso mais comum em barbearia pequena e o dono cortar cabelo. Se um
 * OWNER/MANAGER tem um `Professional` vinculado, ele usa o portal normalmente
 * — porem com TODAS as permissoes liberadas, porque a secao 18 restringe o
 * papel PROFESSIONAL, nao quem ja e administrador do tenant. Sem isso o dono
 * cairia em "sem permissao" na propria barbearia.
 */

import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveTenant } from "@/lib/auth-guard";
import {
  DEFAULT_PERMISSIONS,
  getPermissions,
  type ProfessionalPermissions,
} from "@/lib/permissions";

export type ProfessionalContext = {
  barbershopId: string;
  userId: string;
  role: UserRole;
  /** Id do registro Professional vinculado ao usuario. */
  professionalId: string;
  professionalName: string;
  /** Nome do usuario logado, para a auditoria. */
  userName: string;
  timezone: string;
  permissions: ProfessionalPermissions;
  /** OWNER/MANAGER atendendo: nao sofre as restricoes da secao 18. */
  isManager: boolean;
};

/** Todas as permissoes liberadas — usado para OWNER/MANAGER que atendem. */
const MANAGER_PERMISSIONS: ProfessionalPermissions = {
  ...DEFAULT_PERMISSIONS,
  canViewOthersAgenda: true,
  canCreateAppointment: true,
  canReschedule: true,
  canCancelAppointment: true,
  canCreateWalkIn: true,
  canBlockSchedule: true,
  canViewCustomerPhone: true,
  canEditCustomer: true,
  maxDiscountPercent: 100,
  canReceivePayment: true,
  canViewTeamRanking: true,
};

const PORTAL_ROLES: UserRole[] = [
  UserRole.PROFESSIONAL,
  UserRole.OWNER,
  UserRole.MANAGER,
];

export async function resolveProfessional(
  request: Request,
): Promise<ProfessionalContext | NextResponse> {
  const ctx = await resolveTenant(request);
  if (ctx instanceof NextResponse) return ctx;

  if (!PORTAL_ROLES.includes(ctx.role)) {
    return NextResponse.json(
      { error: "Este portal e exclusivo dos profissionais da barbearia." },
      { status: 403 },
    );
  }

  try {
    const professional = await prisma.professional.findFirst({
      where: { barbershopId: ctx.barbershopId, userId: ctx.userId, active: true },
      select: {
        id: true,
        name: true,
        barbershop: { select: { timezone: true } },
      },
    });

    if (!professional) {
      // Mensagem util de proposito: o gestor precisa saber o que fazer.
      return NextResponse.json(
        {
          error:
            "Seu usuario ainda nao esta vinculado a um profissional. Peca ao administrador para criar o acesso na tela de Profissionais.",
          code: "NO_PROFESSIONAL_LINK",
        },
        { status: 403 },
      );
    }

    const isManager = ctx.role === UserRole.OWNER || ctx.role === UserRole.MANAGER;

    const [permissions, user] = await Promise.all([
      isManager ? Promise.resolve(MANAGER_PERMISSIONS) : getPermissions(ctx.barbershopId),
      prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } }),
    ]);

    return {
      barbershopId: ctx.barbershopId,
      userId: ctx.userId,
      role: ctx.role,
      professionalId: professional.id,
      professionalName: professional.name,
      userName: user?.name ?? professional.name,
      timezone: professional.barbershop?.timezone || "America/Sao_Paulo",
      permissions,
      isManager,
    };
  } catch (error) {
    console.error("[professional-guard]", error);
    return NextResponse.json({ error: "Banco de dados indisponivel." }, { status: 503 });
  }
}

/**
 * Barra a acao quando a permissao esta desligada.
 * Devolve `null` quando permitido — mesmo contrato do `guardRole`.
 */
export function guardPermission(
  ctx: ProfessionalContext,
  permission: keyof ProfessionalPermissions,
  message?: string,
): NextResponse | null {
  const value = ctx.permissions[permission];
  const allowed = typeof value === "number" ? value > 0 : value;

  if (allowed) return null;

  return NextResponse.json(
    {
      error:
        message ??
        "Voce nao tem permissao para esta acao. Fale com o administrador da barbearia.",
      code: "PERMISSION_DENIED",
      permission,
    },
    { status: 403 },
  );
}

/**
 * Aplica a regra de privacidade do telefone (secao 7 / LGPD).
 * Mostra os quatro ultimos digitos para o barbeiro reconhecer o contato sem
 * expor o numero inteiro.
 */
export function maskPhone(
  phone: string | null | undefined,
  canView: boolean,
): string | null {
  if (!phone) return null;
  if (canView) return phone;

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `•••• ${digits.slice(-4)}`;
}
