-- Portos existentes continuam com o acesso que tinham antes desta atualização.
ALTER TABLE "Porto" ADD COLUMN IF NOT EXISTS "aprovacaoPendente" BOOLEAN NOT NULL DEFAULT false;
