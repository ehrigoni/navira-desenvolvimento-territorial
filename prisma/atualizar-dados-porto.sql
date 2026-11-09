BEGIN;
SELECT pg_advisory_xact_lock(hashtext('navira-atualizar-dados-porto'));

ALTER TABLE "Porto" ADD COLUMN IF NOT EXISTS "razaoSocial" TEXT;
ALTER TABLE "Porto" ADD COLUMN IF NOT EXISTS "cnae" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Porto' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE "Porto" ADD COLUMN "cnpj" TEXT;
    UPDATE "Porto"
    SET "cnpj" = "identificador"
    WHERE "tipoIdentificador" = 'CNPJ' AND "identificador" IS NOT NULL;
  END IF;
END $$;

COMMIT;
