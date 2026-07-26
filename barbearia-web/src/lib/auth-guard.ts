import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TenantContext = {
  barbershopId: string;
  userId: string;
  role: UserRole;
};

/**
 * Extrai e REVALIDA o contexto do tenant a partir do JWT.
 * - 401 se nao autenticado.
 * - 403 se o vinculo foi desativado ou a barbearia nao esta ATIVA.
 * Revalida no banco a cada request para que desativar usuario/tenant tenha
 * efeito imediato (sem esperar o JWT de 30 dias expirar). O role tambem vem
 * do banco, refletindo mudancas de permissao na hora.
 */
export async function resolveTenant(
  request: Request,
): Promise<TenantContext | NextResponse> {
  const token = await getToken({
    req: request as never,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.activeBarbershopId || !token?.userId) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const barbershopId = token.activeBarbershopId as string;
  const userId = token.userId as string;

  try {
    const membership = await prisma.barbershopUser.findUnique({
      where: { barbershopId_userId: { barbershopId, userId } },
      include: {
        barbershop: { select: { status: true, trialEndsAt: true } },
        user: { select: { active: true } },
      },
    });

    if (
      !membership ||
      !membership.active ||
      !membership.user.active ||
      membership.barbershop.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Acesso revogado." }, { status: 403 });
    }

    // Trial expirado bloqueia tambem a API (o proxy.ts so cobre paginas).
    const trialEndsAt = membership.barbershop.trialEndsAt;
    if (trialEndsAt && trialEndsAt < new Date()) {
      return NextResponse.json(
        { error: "Periodo de teste expirado. Contrate um plano para continuar." },
        { status: 403 },
      );
    }

    return { barbershopId, userId, role: membership.role };
  } catch {
    return NextResponse.json({ error: "Banco de dados indisponivel." }, { status: 503 });
  }
}

/**
 * Verifica se o role esta na lista de permitidos.
 * Retorna NextResponse 403 se nao tiver permissao, ou null se OK.
 */
export function guardRole(
  role: UserRole,
  allowed: UserRole[],
): NextResponse | null {
  if (!allowed.includes(role)) {
    return NextResponse.json(
      { error: "Sem permissao para esta acao." },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Valida sessao e exige role SUPERADMIN ativo. Usado nas rotas /api/admin/*.
 * Revalida no banco que o usuario ainda e um SUPERADMIN ativo.
 */
export async function resolveAdmin(
  request: Request,
): Promise<{ userId: string; role: UserRole } | NextResponse> {
  const token = await getToken({
    req: request as never,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.userId) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  if (token.role !== UserRole.SUPERADMIN) {
    return NextResponse.json({ error: "Acesso restrito ao admin master." }, { status: 403 });
  }

  const userId = token.userId as string;

  try {
    const admin = await prisma.barbershopUser.findFirst({
      where: { userId, role: UserRole.SUPERADMIN, active: true, user: { active: true } },
    });
    if (!admin) {
      return NextResponse.json({ error: "Acesso restrito ao admin master." }, { status: 403 });
    }
    return { userId, role: UserRole.SUPERADMIN };
  } catch {
    return NextResponse.json({ error: "Banco de dados indisponivel." }, { status: 503 });
  }
}

/** Roles que podem gerenciar a barbearia (owner e manager) */
export const MANAGER_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER];

/** Roles que operam comandas/atendimento (inclui recepcao, conforme escopo) */
export const OPERATION_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.RECEPTION,
];

/** Todos os roles internos (exclui cliente final) */
export const STAFF_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.PROFESSIONAL,
  UserRole.RECEPTION,
];
