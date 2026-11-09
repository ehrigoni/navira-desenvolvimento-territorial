CREATE TABLE IF NOT EXISTS "ConviteAdministrador" (
  "tokenHash" TEXT NOT NULL,
  "criadoPorId" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiraEm" TIMESTAMP(3) NOT NULL,
  "usadoEm" TIMESTAMP(3),
  CONSTRAINT "ConviteAdministrador_pkey" PRIMARY KEY ("tokenHash"),
  CONSTRAINT "ConviteAdministrador_criadoPorId_fkey" FOREIGN KEY ("criadoPorId")
    REFERENCES "Administrador"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ConviteAdministrador_criadoPorId_idx" ON "ConviteAdministrador"("criadoPorId");
