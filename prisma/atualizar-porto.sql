BEGIN;
SELECT pg_advisory_xact_lock(hashtext('navira-atualizar-porto'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoPagamentoPorto' AND typnamespace = current_schema()::regnamespace) THEN
    CREATE TYPE "TipoPagamentoPorto" AS ENUM ('ASSINATURA_ANUAL', 'CREDITO_CONTRATACAO', 'COTA_APOIO');
  END IF;
END $$;

ALTER TABLE "Porto" ADD COLUMN IF NOT EXISTS "assinaturaAteEm" TIMESTAMP(3);
ALTER TABLE "Porto" ADD COLUMN IF NOT EXISTS "creditosContratacao" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Vaga" ADD COLUMN IF NOT EXISTS "portoId" TEXT;
ALTER TABLE "Vaga" ALTER COLUMN "destinoId" DROP NOT NULL;
ALTER TABLE "Curso" ADD COLUMN IF NOT EXISTS "portoId" TEXT;

CREATE TABLE IF NOT EXISTS "ApoioIniciativa" (
  "id" TEXT NOT NULL,
  "iniciativaId" TEXT NOT NULL,
  "naveganteId" TEXT,
  "portoId" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApoioIniciativa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Contratacao" (
  "id" TEXT NOT NULL,
  "portoId" TEXT NOT NULL,
  "naveganteId" TEXT NOT NULL,
  "vagaId" TEXT NOT NULL,
  "valorCentavos" INTEGER NOT NULL,
  "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contratacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Apadrinhamento" (
  "padrinhoId" TEXT NOT NULL,
  "afilhadoId" TEXT NOT NULL,
  "cotas" INTEGER NOT NULL DEFAULT 0,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Apadrinhamento_pkey" PRIMARY KEY ("padrinhoId", "afilhadoId")
);

CREATE TABLE IF NOT EXISTS "PagamentoPorto" (
  "id" TEXT NOT NULL,
  "portoId" TEXT NOT NULL,
  "afilhadoId" TEXT,
  "tipo" "TipoPagamentoPorto" NOT NULL,
  "quantidade" INTEGER NOT NULL DEFAULT 1,
  "valorCentavos" INTEGER NOT NULL,
  "status" "PedidoStatus" NOT NULL DEFAULT 'PENDENTE',
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pagoEm" TIMESTAMP(3),
  CONSTRAINT "PagamentoPorto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ApoioIniciativa_naveganteId_idx" ON "ApoioIniciativa"("naveganteId");
CREATE INDEX IF NOT EXISTS "ApoioIniciativa_portoId_idx" ON "ApoioIniciativa"("portoId");
CREATE UNIQUE INDEX IF NOT EXISTS "ApoioIniciativa_iniciativaId_naveganteId_key" ON "ApoioIniciativa"("iniciativaId", "naveganteId");
CREATE UNIQUE INDEX IF NOT EXISTS "ApoioIniciativa_iniciativaId_portoId_key" ON "ApoioIniciativa"("iniciativaId", "portoId");
CREATE INDEX IF NOT EXISTS "Contratacao_portoId_idx" ON "Contratacao"("portoId");
CREATE INDEX IF NOT EXISTS "PagamentoPorto_portoId_status_idx" ON "PagamentoPorto"("portoId", "status");
CREATE INDEX IF NOT EXISTS "Vaga_portoId_idx" ON "Vaga"("portoId");
CREATE INDEX IF NOT EXISTS "Curso_portoId_idx" ON "Curso"("portoId");

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN SELECT * FROM (VALUES
    ('Vaga', 'portoId', 'Porto', 'Vaga_portoId_fkey'),
    ('Curso', 'portoId', 'Porto', 'Curso_portoId_fkey'),
    ('ApoioIniciativa', 'iniciativaId', 'IniciativaPorto', 'ApoioIniciativa_iniciativaId_fkey'),
    ('ApoioIniciativa', 'naveganteId', 'Navegante', 'ApoioIniciativa_naveganteId_fkey'),
    ('ApoioIniciativa', 'portoId', 'Porto', 'ApoioIniciativa_portoId_fkey'),
    ('Contratacao', 'portoId', 'Porto', 'Contratacao_portoId_fkey'),
    ('Contratacao', 'naveganteId', 'Navegante', 'Contratacao_naveganteId_fkey'),
    ('Contratacao', 'vagaId', 'Vaga', 'Contratacao_vagaId_fkey'),
    ('Apadrinhamento', 'padrinhoId', 'Porto', 'Apadrinhamento_padrinhoId_fkey'),
    ('Apadrinhamento', 'afilhadoId', 'Porto', 'Apadrinhamento_afilhadoId_fkey'),
    ('PagamentoPorto', 'portoId', 'Porto', 'PagamentoPorto_portoId_fkey'),
    ('PagamentoPorto', 'afilhadoId', 'Porto', 'PagamentoPorto_afilhadoId_fkey')
  ) AS keys(tabela, coluna, referencia, nome)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.nome AND conrelid = format('%I', fk.tabela)::regclass) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I("id") ON DELETE CASCADE ON UPDATE CASCADE',
        fk.tabela, fk.nome, fk.coluna, fk.referencia
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
