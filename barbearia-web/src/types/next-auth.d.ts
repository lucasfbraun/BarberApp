import { UserRole } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole | null;
      activeBarbershopId: string | null;
      activeBarbershopSlug: string | null;
      trialEndsAt: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    activeBarbershopId?: string | null;
    activeBarbershopSlug?: string | null;
    role?: UserRole | null;
    trialEndsAt?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole | null;
    activeBarbershopId?: string | null;
    activeBarbershopSlug?: string | null;
    trialEndsAt?: string | null;
  }
}
