import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

export type TenantContext = {
  barbershopId: string;
  userId: string;
  role: UserRole;
};

/**
 * Extrai o contexto do tenant a partir do JWT.
 * Retorna um NextResponse 401 se não autenticado, ou o contexto se OK.
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

  return {
    barbershopId: token.activeBarbershopId as string,
    userId: token.userId as string,
    role: token.role as UserRole,
  };
}

/**
 * Verifica se o role está na lista de permitidos.
 * Retorna NextResponse 403 se não tiver permissão, ou null se OK.
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

/** Roles que podem gerenciar a barbearia (owner e manager) */
export const MANAGER_ROLES: UserRole[] = [UserRole.OWNER, UserRole.MANAGER];

/** Todos os roles internos (exclui cliente final) */
export const STAFF_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.PROFESSIONAL,
  UserRole.RECEPTION,
];
