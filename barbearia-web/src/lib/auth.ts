import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolveSocialUser } from "@/lib/social-login";

type ProviderList = NextAuthOptions["providers"];

/**
 * Ordem de precedencia quando o usuario tem mais de um vinculo ativo.
 * Menor numero ganha.
 *
 * O SUPERADMIN vem primeiro porque o painel do SaaS nao pode depender de
 * sorte na ordenacao do banco. Os demais seguem a hierarquia natural.
 */
const PRIORIDADE_DE_PAPEL: Record<UserRole, number> = {
  SUPERADMIN: 0,
  OWNER: 1,
  MANAGER: 2,
  RECEPTION: 3,
  PROFESSIONAL: 4,
};

/**
 * Provedores sociais so entram na lista se as credenciais existirem no
 * ambiente. Assim o app continua subindo (com e-mail e senha) antes de os
 * apps do Google/Facebook estarem criados — e o front descobre o que esta
 * ativo via /api/auth/providers. Ver AUTH.md.
 */
function socialProviders(): ProviderList {
  const list: ProviderList = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Deixa a pessoa escolher a conta em vez de reusar a ultima sessao.
        authorization: { params: { prompt: "select_account" } },
      }),
    );
  }

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    list.push(
      FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      }),
    );
  }

  return list;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    // Login social so existe na area do cliente, e o login por senha nunca
    // redireciona (usa redirect: false). Entao todo erro que cai aqui e social.
    error: "/cliente/login",
  },
  providers: [
    ...socialProviders(),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
        /**
         * `"admin"` quando o login veio da porta do painel do SaaS.
         *
         * E o que permite ao MESMO e-mail servir aos dois papeis: entrando
         * pelo `/login` a pessoa e dona da propria barbearia; entrando pela
         * porta do admin, ela e SUPERADMIN. O destino e decidido pela porta,
         * nao por adivinhacao.
         */
        scope: { label: "Escopo", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();
        const querPainelDoSaas = credentials?.scope === "admin";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: {
                barbershop: true,
              },
            },
          },
        });

        if (!user || !user.active) {
          return null;
        }

        // Conta criada por login social nao tem senha — nao ha o que comparar.
        if (!user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        // Seleciona apenas um vinculo ATIVO em barbearia ATIVA.
        // Sem fallback para memberships[0]: desativar o vinculo (active=false)
        // nao deve conceder acesso ao painel/tenant.
        //
        const ativos = user.memberships
          .filter((item) => item.active && item.barbershop.status === "ACTIVE")
          .sort((a, b) => PRIORIDADE_DE_PAPEL[a.role] - PRIORIDADE_DE_PAPEL[b.role]);

        // A PORTA DECIDE O PAPEL.
        //
        // Pela entrada do painel do SaaS, so o vinculo SUPERADMIN serve — sem
        // ele, o login falha. Pela entrada normal, o SUPERADMIN e IGNORADO,
        // para que quem administra o SaaS e tambem tem barbearia consiga
        // operar as duas coisas com o mesmo e-mail.
        //
        // A excecao no final evita trancar para fora quem SO tem o vinculo de
        // admin: entra e o middleware o redireciona para o painel do SaaS.
        let membership;
        if (querPainelDoSaas) {
          membership = ativos.find((item) => item.role === UserRole.SUPERADMIN);
          if (!membership) return null;
        } else {
          membership =
            ativos.find((item) => item.role !== UserRole.SUPERADMIN) ?? ativos[0];
        }

        const activeBarbershop = membership?.barbershop ?? null;

        // Com plano ativo ou isencao (billingExempt), o trial nao se aplica:
        // nao carregamos trialEndsAt no JWT, entao o proxy nunca bloqueia.
        const shop = activeBarbershop;
        const hasContract = Boolean(shop?.planId) || shop?.billingExempt === true;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: membership?.role ?? null,
          activeBarbershopId: shop?.id ?? null,
          activeBarbershopSlug: shop?.slug ?? null,
          trialEndsAt: hasContract ? null : shop?.trialEndsAt?.toISOString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Só roda para login social. O provedor devolve um id proprio; aqui
     * trocamos pelo id do NOSSO banco (criando ou vinculando a conta) para que
     * o resto da aplicacao continue enxergando um User normal.
     * Devolver uma string redireciona o usuario para aquela URL.
     */
    async signIn({ user, account, profile }) {
      if (!account || account.provider === "credentials") return true;

      // Google informa explicitamente se o e-mail foi verificado.
      // O Facebook so devolve e-mail ja confirmado pela Meta.
      const googleProfile = profile as { email_verified?: boolean } | undefined;
      const emailVerified =
        account.provider === "google"
          ? googleProfile?.email_verified === true
          : account.provider === "facebook";

      const result = await resolveSocialUser({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        email: user.email ?? null,
        emailVerified,
        name: user.name ?? null,
        image: user.image ?? null,
      });

      if (!result.ok) {
        return `/cliente/login?error=${result.error}`;
      }

      // O callback jwt le estes campos logo em seguida.
      user.id = result.userId;
      // Login social e exclusivo do cliente final: sem painel, sem tenant.
      user.role = null;
      user.activeBarbershopId = null;
      user.activeBarbershopSlug = null;
      user.trialEndsAt = null;

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role ?? null;
        token.activeBarbershopId = user.activeBarbershopId ?? null;
        token.activeBarbershopSlug = user.activeBarbershopSlug ?? null;
        token.trialEndsAt = user.trialEndsAt ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role ?? null;
        session.user.activeBarbershopId = token.activeBarbershopId ?? null;
        session.user.activeBarbershopSlug = token.activeBarbershopSlug ?? null;
        session.user.trialEndsAt = token.trialEndsAt ?? null;
      }

      return session;
    },
  },
};
