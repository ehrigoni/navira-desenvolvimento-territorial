-- As contas existentes conservam seu estado atual.
ALTER TABLE "Administrador" ADD COLUMN IF NOT EXISTS "aprovacaoPendente" BOOLEAN NOT NULL DEFAULT false;
