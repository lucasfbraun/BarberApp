-- Backfill dos vinculos profissional <-> servico.
--
-- Ate aqui, criar um profissional nao vinculava nenhum servico a ele, e o
-- agendamento publico so lista quem tem vinculo com o servico escolhido —
-- entao a barbearia via "nenhum profissional disponivel" mesmo tendo equipe.
-- As rotas de criacao passaram a vincular tudo automaticamente; esta migration
-- resolve quem ja estava cadastrado.
--
-- Regras:
--  - so profissional ATIVO x servico ATIVO, dentro da MESMA barbearia;
--  - `ON CONFLICT DO NOTHING` preserva vinculos ja existentes, inclusive os
--    que foram desativados de proposito (active = false) — desvincular
--    continua valendo.

INSERT INTO "ProfessionalService" ("id", "professionalId", "serviceId", "active")
SELECT
    gen_random_uuid()::text,
    p."id",
    s."id",
    true
FROM "Professional" p
JOIN "Service" s ON s."barbershopId" = p."barbershopId"
WHERE p."active" = true
  AND s."active" = true
ON CONFLICT ("professionalId", "serviceId") DO NOTHING;
