-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('NAVEGANTE', 'PORTO');

-- CreateEnum
CREATE TYPE "EthosStatus" AS ENUM ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "TipoPorto" AS ENUM ('IGREJA', 'ESCOLA', 'ASSOCIACAO', 'INICIATIVA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusCandidatura" AS ENUM ('ESCOLHIDA', 'CANDIDATADA', 'ENTREVISTADA', 'CONTRATADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('PRESENCIAL', 'REMOTA', 'HIBRIDA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "ethosStatus" "EthosStatus" NOT NULL DEFAULT 'NAO_INICIADO',
    "tokenRecuperacao" TEXT,
    "expiracaoTokenRecuperacao" TIMESTAMP(3),
    "recuperacaoJanelaInicio" TIMESTAMP(3),
    "recuperacoesNaJanela" INTEGER NOT NULL DEFAULT 0,
    "ultimoLoginEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Navegante" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cep" TEXT,

    CONSTRAINT "Navegante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Porto" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nome" TEXT NOT NULL,
    "tipo" "TipoPorto" NOT NULL DEFAULT 'OUTRO',
    "cep" TEXT NOT NULL,
    "logradouro" TEXT,
    "numero" TEXT,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Porto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscricaoPorto" (
    "naveganteId" TEXT NOT NULL,
    "portoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InscricaoPorto_pkey" PRIMARY KEY ("naveganteId","portoId")
);

-- CreateTable
CREATE TABLE "Destino" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" TEXT,
    "cnae" TEXT,
    "cep" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Destino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpresaPorto" (
    "destinoId" TEXT NOT NULL,
    "portoId" TEXT NOT NULL,

    CONSTRAINT "EmpresaPorto_pkey" PRIMARY KEY ("destinoId","portoId")
);

-- CreateTable
CREATE TABLE "Vaga" (
    "id" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "salario" DECIMAL(12,2),
    "cidade" TEXT,
    "uf" CHAR(2),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "publicadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "cargaHoraria" INTEGER,
    "modalidade" "Modalidade" NOT NULL DEFAULT 'PRESENCIAL',
    "instituicao" TEXT,
    "destinoId" TEXT,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VagaCurso" (
    "vagaId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,

    CONSTRAINT "VagaCurso_pkey" PRIMARY KEY ("vagaId","cursoId")
);

-- CreateTable
CREATE TABLE "VagaNavegante" (
    "naveganteId" TEXT NOT NULL,
    "vagaId" TEXT NOT NULL,
    "status" "StatusCandidatura" NOT NULL DEFAULT 'ESCOLHIDA',
    "statusEm" TIMESTAMP(3),

    CONSTRAINT "VagaNavegante_pkey" PRIMARY KEY ("naveganteId","vagaId")
);

-- CreateTable
CREATE TABLE "CursoNavegante" (
    "naveganteId" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "realizado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CursoNavegante_pkey" PRIMARY KEY ("naveganteId","cursoId")
);

-- CreateTable
CREATE TABLE "Contratacao" (
    "id" TEXT NOT NULL,
    "naveganteId" TEXT NOT NULL,
    "vagaId" TEXT,
    "destinoId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "salario" DECIMAL(12,2),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contratacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_telefone_key" ON "Usuario"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_tokenRecuperacao_key" ON "Usuario"("tokenRecuperacao");

-- CreateIndex
CREATE UNIQUE INDEX "Navegante_usuarioId_key" ON "Navegante"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Porto_usuarioId_key" ON "Porto"("usuarioId");

-- CreateIndex
CREATE INDEX "Porto_cidade_uf_idx" ON "Porto"("cidade", "uf");

-- CreateIndex
CREATE UNIQUE INDEX "Destino_cnpj_key" ON "Destino"("cnpj");

-- CreateIndex
CREATE INDEX "Destino_cidade_uf_idx" ON "Destino"("cidade", "uf");

-- CreateIndex
CREATE INDEX "Vaga_ativa_idx" ON "Vaga"("ativa");

-- CreateIndex
CREATE INDEX "Contratacao_naveganteId_idx" ON "Contratacao"("naveganteId");

-- CreateIndex
CREATE INDEX "Contratacao_destinoId_idx" ON "Contratacao"("destinoId");

-- AddForeignKey
ALTER TABLE "Navegante" ADD CONSTRAINT "Navegante_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Porto" ADD CONSTRAINT "Porto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscricaoPorto" ADD CONSTRAINT "InscricaoPorto_naveganteId_fkey" FOREIGN KEY ("naveganteId") REFERENCES "Navegante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscricaoPorto" ADD CONSTRAINT "InscricaoPorto_portoId_fkey" FOREIGN KEY ("portoId") REFERENCES "Porto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaPorto" ADD CONSTRAINT "EmpresaPorto_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaPorto" ADD CONSTRAINT "EmpresaPorto_portoId_fkey" FOREIGN KEY ("portoId") REFERENCES "Porto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaga" ADD CONSTRAINT "Vaga_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VagaCurso" ADD CONSTRAINT "VagaCurso_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VagaCurso" ADD CONSTRAINT "VagaCurso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VagaNavegante" ADD CONSTRAINT "VagaNavegante_naveganteId_fkey" FOREIGN KEY ("naveganteId") REFERENCES "Navegante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VagaNavegante" ADD CONSTRAINT "VagaNavegante_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoNavegante" ADD CONSTRAINT "CursoNavegante_naveganteId_fkey" FOREIGN KEY ("naveganteId") REFERENCES "Navegante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoNavegante" ADD CONSTRAINT "CursoNavegante_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contratacao" ADD CONSTRAINT "Contratacao_naveganteId_fkey" FOREIGN KEY ("naveganteId") REFERENCES "Navegante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contratacao" ADD CONSTRAINT "Contratacao_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contratacao" ADD CONSTRAINT "Contratacao_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
