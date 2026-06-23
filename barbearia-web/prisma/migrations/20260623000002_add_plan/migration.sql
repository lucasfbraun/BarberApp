-- CreateTable Plan
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "maxProfessionals" INTEGER NOT NULL DEFAULT -1,
    "features" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- AlterTable Barbershop: add planId
ALTER TABLE "Barbershop" ADD COLUMN "planId" TEXT;

-- AddForeignKey
ALTER TABLE "Barbershop" ADD CONSTRAINT "Barbershop_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default plans
INSERT INTO "Plan" ("id","name","slug","description","price","maxProfessionals","features","isActive","displayOrder","createdAt","updatedAt") VALUES
  (gen_random_uuid()::text,'Básico','basico','Ideal para barbearias que estão começando.',49.00,2,'["Até 2 profissionais","Agendamento online","Página pública","Agenda interna","Suporte por e-mail"]',true,1,NOW(),NOW()),
  (gen_random_uuid()::text,'Profissional','profissional','Para barbearias em crescimento com equipe ativa.',99.00,8,'["Até 8 profissionais","Tudo do Básico","Relatórios de faturamento","Controle de comissões","Suporte prioritário via WhatsApp"]',true,2,NOW(),NOW()),
  (gen_random_uuid()::text,'Premium','premium','Para redes de barbearias com múltiplas unidades.',199.00,-1,'["Profissionais ilimitados","Tudo do Profissional","Múltiplas unidades","API de integração","Gerente de conta dedicado"]',true,3,NOW(),NOW());
