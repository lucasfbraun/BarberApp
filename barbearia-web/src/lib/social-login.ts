/**
 * Resolucao de usuario no login social (Google/Facebook).
 *
 * Regras (ver AUTH.md):
 * 1. Se o provedor ja foi vinculado antes, entra na mesma conta.
 * 2. Se nao, e o e-mail (verificado pelo provedor) ja existe, VINCULA a conta
 *    existente — a mesma pessoa nao vira dois cadastros.
 * 3. Se nao existe, cria a conta sem senha.
 * 4. Conta com vinculo de barbearia (staff/admin) NAO entra por social:
 *    o painel exige e-mail e senha.
 */

import { prisma } from "@/lib/prisma";

// Cast temporario ate o Prisma Client ser regenerado com o model Account (B2).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

/** Codigos devolvidos na querystring de /cliente/login?error=... */
export type SocialLoginError =
  | "SemEmail"
  | "EmailNaoVerificado"
  | "ContaInativa"
  | "ContaDeBarbearia"
  | "ErroInterno";

export type SocialLoginResult =
  | { ok: true; userId: string }
  | { ok: false; error: SocialLoginError };

export type SocialProfile = {
  provider: string;
  providerAccountId: string;
  email: string | null;
  /** O provedor confirma que o e-mail pertence a pessoa. */
  emailVerified: boolean;
  name: string | null;
  image: string | null;
};

/** Nome de exibicao a partir do e-mail, quando o provedor nao manda nome. */
function fallbackName(email: string): string {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!local) return "Cliente";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** Contas com vinculo ativo de barbearia ou superadmin ficam fora do social. */
async function isStaffAccount(userId: string): Promise<boolean> {
  const membership = await prisma.barbershopUser.findFirst({
    where: { userId, active: true },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function resolveSocialUser(profile: SocialProfile): Promise<SocialLoginResult> {
  const email = profile.email?.trim().toLowerCase() || null;

  // Facebook permite conta so com telefone; sem e-mail nao ha como
  // identificar nem vincular com seguranca.
  if (!email) return { ok: false, error: "SemEmail" };

  try {
    // 1. Provedor ja vinculado.
    const linked = await db.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      select: { userId: true },
    });

    if (linked) {
      const user = await prisma.user.findUnique({
        where: { id: linked.userId },
        select: { id: true, active: true },
      });
      if (!user || !user.active) return { ok: false, error: "ContaInativa" };
      if (await isStaffAccount(user.id)) return { ok: false, error: "ContaDeBarbearia" };
      return { ok: true, userId: user.id };
    }

    // 2. E-mail ja cadastrado: vincula, desde que o provedor tenha verificado.
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, active: true, avatarUrl: true },
    });

    if (existing) {
      if (!profile.emailVerified) return { ok: false, error: "EmailNaoVerificado" };
      if (!existing.active) return { ok: false, error: "ContaInativa" };
      if (await isStaffAccount(existing.id)) return { ok: false, error: "ContaDeBarbearia" };

      await db.account.create({
        data: {
          userId: existing.id,
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      });

      // Aproveita a foto do provedor so se a conta ainda nao tem avatar.
      if (!existing.avatarUrl && profile.image) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { avatarUrl: profile.image },
        });
      }

      return { ok: true, userId: existing.id };
    }

    // 3. Primeiro acesso: cria a conta sem senha.
    if (!profile.emailVerified) return { ok: false, error: "EmailNaoVerificado" };

    const created = await db.user.create({
      data: {
        name: profile.name?.trim() || fallbackName(email),
        email,
        passwordHash: null,
        avatarUrl: profile.image,
        accounts: {
          create: {
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
          },
        },
      },
      select: { id: true },
    });

    return { ok: true, userId: created.id };
  } catch (error) {
    console.error("[social-login]", error);
    return { ok: false, error: "ErroInterno" };
  }
}
