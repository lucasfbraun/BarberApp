-- Isenção de contrato: barbearia isenta nunca é bloqueada por trial/cobrança.
ALTER TABLE "Barbershop" ADD COLUMN "billingExempt" BOOLEAN NOT NULL DEFAULT false;
