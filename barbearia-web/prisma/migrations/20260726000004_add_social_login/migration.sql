-- Login social (Google/Facebook) para o cliente final.

-- Conta criada por provedor social nao tem senha.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Vinculo usuario <-> provedor. Sem tokens: o app nao chama APIs do
-- Google/Meta em nome do usuario, so identifica quem esta entrando.
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
