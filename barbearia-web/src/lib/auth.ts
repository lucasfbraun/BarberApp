import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();

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

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        const membership = user.memberships.find(
          (item) => item.active && item.barbershop.status === "ACTIVE",
        ) ?? user.memberships[0];
        const activeBarbershop = membership?.barbershop ?? null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: membership?.role ?? null,
          activeBarbershopId: activeBarbershop?.id ?? null,
          activeBarbershopSlug: activeBarbershop?.slug ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role ?? null;
        token.activeBarbershopId = user.activeBarbershopId ?? null;
        token.activeBarbershopSlug = user.activeBarbershopSlug ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role ?? null;
        session.user.activeBarbershopId = token.activeBarbershopId ?? null;
        session.user.activeBarbershopSlug = token.activeBarbershopSlug ?? null;
      }

      return session;
    },
  },
};