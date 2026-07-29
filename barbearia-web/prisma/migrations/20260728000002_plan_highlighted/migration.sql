-- Selo "Mais popular" controlado pelo admin.
--
-- Antes a landing destacava sozinha o plano do MEIO da lista. Isso tirava a
-- decisao de quem vende e, pior, mudava sozinho: criar ou desativar um plano
-- movia o selo para outro, sem ninguem pedir.

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "highlighted" BOOLEAN NOT NULL DEFAULT false;

-- Preserva o que a landing ja mostrava: o plano do meio entre os ativos.
-- Sem isto, o selo sumiria da pagina no deploy desta migration.
UPDATE "Plan"
SET "highlighted" = true
WHERE "id" = (
  SELECT "id" FROM "Plan"
  WHERE "isActive" = true
  ORDER BY "displayOrder" ASC
  OFFSET (SELECT COUNT(*) / 2 FROM "Plan" WHERE "isActive" = true)
  LIMIT 1
);
