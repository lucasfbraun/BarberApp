-- Portal do Profissional (MVP — secao 24 do documento de escopo).
--
-- Tres blocos, todos aditivos (nenhuma coluna existente muda de tipo ou some,
-- entao a migration e segura para rodar com a versao anterior do app no ar):
--   1. novos estados de agendamento e de comanda;
--   2. carimbos de tempo do atendimento;
--   3. tabelas de permissoes e de auditoria.

-- ---------------------------------------------------------------------------
-- 1. Novos estados
--
-- Nota: o Prisma roda a migration dentro de uma transacao. No Postgres 12+
-- `ALTER TYPE ... ADD VALUE` e permitido nesse contexto desde que o valor novo
-- NAO seja usado na mesma transacao — por isso o backfill abaixo so referencia
-- estados que ja existiam ('COMPLETED').
-- ---------------------------------------------------------------------------

-- "Cliente chegou": presenca marcada, atendimento ainda nao iniciado.
-- Posicionado depois de CONFIRMED para o enum acompanhar a ordem do fluxo.
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'ARRIVED' AFTER 'CONFIRMED';

-- "Aguardando pagamento": o barbeiro terminou o servico e mandou a comanda
-- para o caixa. Separa conclusao do ATENDIMENTO de conclusao do PAGAMENTO.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT' AFTER 'OPEN';

-- ---------------------------------------------------------------------------
-- 2. Carimbos de tempo do atendimento
-- ---------------------------------------------------------------------------

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "rescheduledFrom" TIMESTAMP(3);

-- Backfill conservador: para atendimentos ja concluidos antes desta versao,
-- o inicio real e desconhecido. Usamos o horario agendado como melhor
-- aproximacao, para que o indicador de tempo medio nao nasca vazio.
UPDATE "Appointment"
SET "startedAt" = "startsAt"
WHERE "status" = 'COMPLETED' AND "startedAt" IS NULL;

-- Preferencias de atendimento do cliente (secao 7): maquina, degrade,
-- acabamento, alergias. Json porque o conjunto de campos varia por barbearia.
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "preferences" JSONB;

-- ---------------------------------------------------------------------------
-- 3. Permissoes por barbearia
-- ---------------------------------------------------------------------------

CREATE TABLE "BarbershopPermissions" (
    "barbershopId" TEXT NOT NULL,
    "canViewOthersAgenda" BOOLEAN NOT NULL DEFAULT false,
    "canCreateAppointment" BOOLEAN NOT NULL DEFAULT true,
    "canReschedule" BOOLEAN NOT NULL DEFAULT true,
    "canCancelAppointment" BOOLEAN NOT NULL DEFAULT false,
    "canCreateWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "canBlockSchedule" BOOLEAN NOT NULL DEFAULT true,
    "canViewCustomerPhone" BOOLEAN NOT NULL DEFAULT true,
    "canEditCustomer" BOOLEAN NOT NULL DEFAULT false,
    "maxDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "canReceivePayment" BOOLEAN NOT NULL DEFAULT false,
    "canViewTeamRanking" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "BarbershopPermissions_pkey" PRIMARY KEY ("barbershopId")
);

ALTER TABLE "BarbershopPermissions"
    ADD CONSTRAINT "BarbershopPermissions_barbershopId_fkey"
    FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Nao populamos uma linha por barbearia: a ausencia de linha ja significa
-- "usar os padroes", resolvido em lib/permissions.ts. Assim uma barbearia
-- criada depois desta migration nao precisa de nenhum passo extra.

-- ---------------------------------------------------------------------------
-- 4. Auditoria (append-only)
-- ---------------------------------------------------------------------------

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_barbershopId_createdAt_idx" ON "AuditLog"("barbershopId", "createdAt");
CREATE INDEX "AuditLog_barbershopId_entity_entityId_idx" ON "AuditLog"("barbershopId", "entity", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_barbershopId_fkey"
    FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
