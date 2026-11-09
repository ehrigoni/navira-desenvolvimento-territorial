BEGIN;
SELECT pg_advisory_xact_lock(hashtext('navira-atualizar-colaboracoes'));

CREATE TABLE IF NOT EXISTS "MetaColaboracao" (
  "id" TEXT PRIMARY KEY,
  "iniciativaId" TEXT NOT NULL REFERENCES "IniciativaPorto"("id") ON DELETE CASCADE,
  "tipo" TEXT NOT NULL,
  "unidade" TEXT NOT NULL,
  "meta" DECIMAL(12,2) NOT NULL CHECK ("meta" > 0)
);
CREATE INDEX IF NOT EXISTS "MetaColaboracao_iniciativaId_idx" ON "MetaColaboracao"("iniciativaId");

CREATE TABLE IF NOT EXISTS "ContribuicaoIniciativa" (
  "id" TEXT PRIMARY KEY,
  "metaId" TEXT NOT NULL REFERENCES "MetaColaboracao"("id") ON DELETE CASCADE,
  "naveganteId" TEXT REFERENCES "Navegante"("id") ON DELETE SET NULL,
  "portoId" TEXT REFERENCES "Porto"("id") ON DELETE SET NULL,
  "quantidade" DECIMAL(12,2) NOT NULL CHECK ("quantidade" > 0),
  "status" TEXT NOT NULL DEFAULT 'PENDENTE' CHECK ("status" IN ('PENDENTE', 'CONFIRMADA', 'RECUSADA')),
  "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decididaEm" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "ContribuicaoIniciativa_metaId_status_idx" ON "ContribuicaoIniciativa"("metaId", "status");
CREATE INDEX IF NOT EXISTS "ContribuicaoIniciativa_naveganteId_idx" ON "ContribuicaoIniciativa"("naveganteId");
CREATE INDEX IF NOT EXISTS "ContribuicaoIniciativa_portoId_idx" ON "ContribuicaoIniciativa"("portoId");
COMMIT;
