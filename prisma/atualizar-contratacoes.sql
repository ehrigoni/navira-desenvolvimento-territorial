BEGIN;
ALTER TABLE "Contratacao" ADD COLUMN IF NOT EXISTS "encerradaEm" TIMESTAMP(3);
ALTER TABLE "Contratacao" ADD COLUMN IF NOT EXISTS "motivoEncerramento" TEXT;
DROP INDEX IF EXISTS "Contratacao_vagaId_naveganteId_key";
CREATE INDEX IF NOT EXISTS "Contratacao_naveganteId_encerradaEm_idx" ON "Contratacao"("naveganteId", "encerradaEm");
CREATE INDEX IF NOT EXISTS "Contratacao_vagaId_encerradaEm_idx" ON "Contratacao"("vagaId", "encerradaEm");
COMMIT;
