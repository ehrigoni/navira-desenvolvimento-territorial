"use server";

import { randomUUID } from "node:crypto";
import { Modalidade, Prisma, StatusPorto, TipoPorto } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { detalhesVaga } from "@/lib/dados-porto";
import { dataCalendario } from "@/lib/data";
import { exigirSessao } from "@/lib/auth";
import { sincronizarMatching } from "@/lib/sincronizar-matching";
import { formatarFaixaSalarial } from "@/lib/matching";
import { apenasDigitos } from "@/lib/validacao";
import { atualizarCandidatura, retirarCandidaturasDoPorto } from "@/lib/contratacao-porto";
import { redirect } from "next/navigation";

export type EstadoAcao = { erro?: string; erros?: Record<string, string>; sucesso?: string };

const TIPOS_PORTO: TipoPorto[] = ["IGREJA", "ESCOLA", "ASSOCIACAO", "INICIATIVA", "EMPRESA", "OUTRO"];
const MODALIDADES: Record<string, Modalidade> = { PRESENCIAL: "PRESENCIAL", ONLINE: "REMOTA", AMBOS: "HIBRIDA" };

function texto(formData: FormData, chave: string) {
  const valor = formData.get(chave);
  return typeof valor === "string" ? valor.trim() : "";
}

async function navegantePorSessao() {
  const sessao = await exigirSessao("NAVEGANTE");
  const navegante = await db.navegante.findUnique({ where: { usuarioId: sessao.sub }, select: { id: true } });
  if (!navegante) throw new Error("Navegante não encontrado para a sessão.");
  return navegante.id;
}

export async function adicionarPorto(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const naveganteId = await navegantePorSessao();

  const dados = {
    nome: texto(formData, "nome"),
    tipo: texto(formData, "tipo"),
    cep: apenasDigitos(texto(formData, "cep")),
    logradouro: texto(formData, "logradouro"),
    numero: texto(formData, "numero"),
    bairro: texto(formData, "bairro"),
    cidade: texto(formData, "cidade"),
    uf: texto(formData, "uf").toUpperCase(),
  };

  const erros: Record<string, string> = {};
  if (!dados.nome) erros.nome = "Informe o nome do porto.";
  if (!TIPOS_PORTO.includes(dados.tipo as TipoPorto)) erros.tipo = "Escolha o tipo do porto.";
  if (!/^\d{8}$/.test(dados.cep)) erros.cep = "CEP inválido. Use 8 dígitos.";
  if (!dados.logradouro) erros.logradouro = "Informe a rua.";
  if (!dados.numero) erros.numero = "Informe o número.";
  if (!dados.bairro) erros.bairro = "Informe o bairro.";
  if (!dados.cidade) erros.cidade = "Informe a cidade.";
  if (!/^[A-Z]{2}$/.test(dados.uf)) erros.uf = "Informe a UF com 2 letras.";
  if (Object.keys(erros).length) return { erros };

  try {
    await db.$transaction(async (tx) => {
      const porto = await tx.porto.create({
        data: {
          nome: dados.nome,
          tipo: dados.tipo as TipoPorto,
          cep: dados.cep,
          logradouro: dados.logradouro,
          numero: dados.numero,
          bairro: dados.bairro,
          cidade: dados.cidade,
          uf: dados.uf,
        },
      });
      await tx.inscricaoPorto.create({ data: { naveganteId, portoId: porto.id } });
    });
    await sincronizarMatching(naveganteId);
  } catch (e) {
    console.error("[navegante] falha ao adicionar porto", e);
    return { erro: "Não foi possível salvar o porto. Tente novamente." };
  }

  revalidatePath("/navegante");
  return { sucesso: "Porto adicionado." };
}

export async function removerPorto(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  const portoId = texto(formData, "portoId");
  await db.inscricaoPorto.deleteMany({ where: { naveganteId, portoId } });
  await sincronizarMatching(naveganteId);
  revalidatePath("/navegante");
}

export async function adicionarCursoRealizado(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const naveganteId = await navegantePorSessao();

  const curso = texto(formData, "curso");
  const descricao = texto(formData, "descricao");
  const cargaHoraria = Number(texto(formData, "cargaHoraria"));
  const instituicao = texto(formData, "instituicao");
  const dataTexto = texto(formData, "dataRealizacao");
  const modalidade = MODALIDADES[texto(formData, "modalidade")];

  const erros: Record<string, string> = {};
  if (!curso) erros.curso = "Informe o nome do curso.";
  if (!descricao) erros.descricao = "Descreva o conteúdo desenvolvido.";
  if (!Number.isInteger(cargaHoraria) || cargaHoraria < 1 || cargaHoraria > 5000) erros.cargaHoraria = "Informe a carga horária em horas.";
  if (!instituicao) erros.instituicao = "Informe a instituição de ensino.";
  const data = dataCalendario(dataTexto);
  if (!data) erros.dataRealizacao = "Informe uma data de realização válida (DD/MM/AAAA).";
  else if (data.getTime() > Date.now()) erros.dataRealizacao = "A data não pode estar no futuro.";
  if (!modalidade) erros.modalidade = "Escolha a modalidade.";
  if (Object.keys(erros).length || !data) return { erros };

  try {
    await db.cursoRealizado.create({
      data: {
        id: randomUUID(),
        naveganteId,
        curso,
        descricao,
        cargaHoraria,
        instituicao,
        dataRealizacao: data,
        modalidade,
      },
    });
    await sincronizarMatching(naveganteId);
  } catch (e) {
    console.error("[navegante] falha ao salvar curso realizado", e);
    return { erro: "Não foi possível salvar o curso. Tente novamente." };
  }

  revalidatePath("/navegante");
  return { sucesso: "Curso registrado." };
}

export async function removerCursoRealizado(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  await db.cursoRealizado.deleteMany({ where: { id: texto(formData, "cursoRealizadoId"), naveganteId } });
  await sincronizarMatching(naveganteId);
  revalidatePath("/navegante");
}

/** Alterna a escolha de uma vaga (VagaNavegante). */
export async function alternarVaga(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  const resultado = await atualizarCandidatura(naveganteId, texto(formData, "vagaId"), "alternar");
  if (resultado !== "atualizada") redirect(`/navegante?aviso=${resultado}`);
  revalidatePath("/navegante");
  revalidatePath("/porto");
}

/** Alterna a escolha de um curso recomendado (CursoNavegante). */
export async function alternarCurso(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  const cursoId = texto(formData, "cursoId");
  const escolhido = await db.cursoNavegante.findUnique({ where: { naveganteId_cursoId: { naveganteId, cursoId } } });
  if (escolhido) {
    await db.cursoNavegante.delete({ where: { naveganteId_cursoId: { naveganteId, cursoId } } });
  } else {
    const curso = await db.curso.findUnique({ where: { id: cursoId }, select: { id: true } });
    if (curso) await db.cursoNavegante.create({ data: { naveganteId, cursoId } });
  }
  revalidatePath("/navegante");
}

export type PortoEncontrado = {
  id: string;
  nome: string;
  tipo: TipoPorto | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  vinculado: boolean;
};

const STATUS_BUSCAVEIS: StatusPorto[] = ["ATIVO", "EM_ANALISE"];

/** Busca portos e entidades cadastrados pelo nome (usada enquanto a pessoa digita). */
export async function buscarPortos(termo: string): Promise<PortoEncontrado[]> {
  const naveganteId = await navegantePorSessao();
  const busca = termo.trim().slice(0, 100);
  if (busca.length < 2) return [];

  // unaccent: "sao" encontra "São". Escapa % e _ para que o texto digitado seja literal.
  const padrao = `%${busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const portos = await db.$queryRaw<PortoEncontrado[]>(Prisma.sql`
    SELECT p.id, p.nome, p.tipo::text AS tipo, p.cidade, p.uf, p.cep,
           EXISTS (SELECT 1 FROM "InscricaoPorto" i WHERE i."portoId" = p.id AND i."naveganteId" = ${naveganteId}) AS vinculado
    FROM "Porto" p
    WHERE unaccent(p.nome) ILIKE unaccent(${padrao})
      AND p.status::text IN ('ATIVO', 'EM_ANALISE')
      AND NOT p."aprovacaoPendente"
    ORDER BY p.nome
    LIMIT 8`);
  return portos;
}

/** Vincula o Navegante a um porto já cadastrado. */
export async function vincularPorto(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  const portoId = texto(formData, "portoId");
  const porto = await db.porto.findFirst({ where: { id: portoId, status: { in: STATUS_BUSCAVEIS }, aprovacaoPendente: false }, select: { id: true } });
  if (porto) {
    await db.inscricaoPorto.upsert({
      where: { naveganteId_portoId: { naveganteId, portoId } },
      create: { naveganteId, portoId },
      update: {},
    });
    await sincronizarMatching(naveganteId);
  }
  revalidatePath("/navegante");
}

export type ItemBusca = { id: string; titulo: string; detalhe: string; escolhido: boolean; indice?: number };

function padraoBusca(termo: string) {
  // unaccent + ILIKE; escapa % e _ para que o texto digitado seja literal.
  return `%${termo.trim().slice(0, 100).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const MODALIDADE_CURTA: Record<string, string> = { PRESENCIAL: "presencial", REMOTA: "online", HIBRIDA: "presencial e online" };

/** Busca vagas ativas pelo título ou pela empresa (enquanto a pessoa digita). */
export async function buscarVagas(termo: string): Promise<ItemBusca[]> {
  const naveganteId = await navegantePorSessao();
  if (termo.trim().length < 2) return [];
  const padrao = padraoBusca(termo);
  // Vaga vem de uma empresa (Destino) ou de um porto (Vaga.portoId): o que estiver preenchido vale.
  const linhas = await db.$queryRaw<{ id: string; titulo: string; razao: string | null; cidade: string | null; uf: string | null; min: number | null; max: number | null; requisitos: unknown; beneficios: string[]; cursos: string | null; escolhido: boolean }[]>(Prisma.sql`
    SELECT v.id, v.titulo, COALESCE(d."razaoSocial", p.nome) AS razao,
           COALESCE(d.cidade, p.cidade) AS cidade, COALESCE(d.uf, p.uf) AS uf,
           v."salarioMinCentavos" AS min, v."salarioMaxCentavos" AS max,
           v.requisitos, v.beneficios,
           (SELECT string_agg(c.nome, ', ' ORDER BY c.nome)
            FROM "VagaCurso" vc JOIN "Curso" c ON c.id = vc."cursoId" WHERE vc."vagaId" = v.id) AS cursos,
           EXISTS (SELECT 1 FROM "VagaNavegante" vn WHERE vn."vagaId" = v.id AND vn."naveganteId" = ${naveganteId}) AS escolhido
    FROM "Vaga" v
    LEFT JOIN "Destino" d ON d.id = v."destinoId"
    LEFT JOIN "Porto" p ON p.id = v."portoId"
    WHERE v.ativa
      AND (unaccent(v.titulo) ILIKE unaccent(${padrao}) OR unaccent(COALESCE(d."razaoSocial", p.nome, '')) ILIKE unaccent(${padrao}))
    ORDER BY v.titulo
    LIMIT 8`);
  return linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    detalhe: [
      l.razao, l.cidade && l.uf ? `${l.cidade}/${l.uf}` : null, formatarFaixaSalarial(l.min, l.max),
      l.cursos ? `Cursos exigidos: ${l.cursos}` : null,
      detalhesVaga(l.requisitos).requisitos ? `Requisitos: ${detalhesVaga(l.requisitos).requisitos}` : null,
      detalhesVaga(l.requisitos).expectativas ? `Expectativas: ${detalhesVaga(l.requisitos).expectativas}` : null,
      l.beneficios.length ? `Benefícios: ${l.beneficios.join(", ")}` : null,
    ].filter(Boolean).join(" · "),
    escolhido: l.escolhido,
  }));
}

/** Busca cursos cadastrados pelo nome (enquanto a pessoa digita). */
export async function buscarCursos(termo: string): Promise<ItemBusca[]> {
  const naveganteId = await navegantePorSessao();
  if (termo.trim().length < 2) return [];
  const padrao = padraoBusca(termo);
  const linhas = await db.$queryRaw<{ id: string; nome: string; carga: number; modalidade: string; instituicao: string | null; inicio: Date | null; termino: Date | null; vagas: number | null; escolhido: boolean }[]>(Prisma.sql`
    SELECT c.id, c.nome, c."cargaHorariaHoras" AS carga, c.modalidade::text AS modalidade, c."instituicaoEnsino" AS instituicao,
           c.inicio, c.termino, c."vagasDisponiveis" AS vagas,
           EXISTS (SELECT 1 FROM "CursoNavegante" cn WHERE cn."cursoId" = c.id AND cn."naveganteId" = ${naveganteId}) AS escolhido
    FROM "Curso" c
    WHERE unaccent(c.nome) ILIKE unaccent(${padrao})
    ORDER BY c.nome
    LIMIT 8`);
  return linhas.map((l) => ({
    id: l.id,
    titulo: l.nome,
    detalhe: [
      `${l.carga}h`, MODALIDADE_CURTA[l.modalidade] ?? l.modalidade.toLowerCase(), l.instituicao,
      l.inicio ? `Início: ${l.inicio.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : null,
      l.termino ? `Término: ${l.termino.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : null,
      l.vagas !== null ? `${l.vagas} vaga(s)` : null,
    ].filter(Boolean).join(" · "),
    escolhido: l.escolhido,
  }));
}

/** Escolhe uma vaga (Enter na busca). Idempotente. */
export async function escolherVaga(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  const resultado = await atualizarCandidatura(naveganteId, texto(formData, "vagaId"), "adicionar");
  if (resultado !== "atualizada") redirect(`/navegante?aviso=${resultado}`);
  revalidatePath("/navegante");
  revalidatePath("/porto");
}

/** Escolhe um curso (Enter na busca). Idempotente. */
export async function escolherCurso(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  const cursoId = texto(formData, "cursoId");
  const curso = await db.curso.findUnique({ where: { id: cursoId }, select: { id: true } });
  if (curso) {
    await db.cursoNavegante.upsert({ where: { naveganteId_cursoId: { naveganteId, cursoId } }, create: { naveganteId, cursoId }, update: {} });
  }
  revalidatePath("/navegante");
}

export async function deixarApoioIniciativaNavegante(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  const iniciativaId = texto(formData, "iniciativaId");
  const iniciativa = await db.iniciativaPorto.findFirst({
    where: { id: iniciativaId, status: "ABERTO", Porto: { inscritos: { some: { naveganteId } } } },
    select: { id: true },
  });
  if (!iniciativa) throw new Error("Iniciativa indisponível para alterar o apoio.");
  await db.apoioIniciativa.deleteMany({ where: { iniciativaId, naveganteId } });
  revalidatePath("/navegante");
  revalidatePath("/porto");
}

/** Remove uma vaga da lista de escolhidas. */
export async function removerVagaEscolhida(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  const resultado = await atualizarCandidatura(naveganteId, texto(formData, "vagaId"), "remover");
  if (resultado !== "atualizada") redirect(`/navegante?aviso=${resultado}`);
  revalidatePath("/navegante");
  revalidatePath("/porto");
}

export async function retirarCandidaturasPorto(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  const resultado = await retirarCandidaturasDoPorto(naveganteId, texto(formData, "portoId"));
  if (resultado !== "atualizada") redirect(`/navegante?aviso=${resultado}`);
  revalidatePath("/navegante");
  revalidatePath("/porto");
}

/** Remove um curso da lista de escolhidos. */
export async function removerCursoEscolhido(formData: FormData) {
  const naveganteId = await navegantePorSessao();
  await db.cursoNavegante.deleteMany({ where: { naveganteId, cursoId: texto(formData, "cursoId") } });
  revalidatePath("/navegante");
}
