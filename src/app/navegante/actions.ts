"use server";

import { randomUUID } from "node:crypto";
import { Modalidade, Prisma, TipoPorto } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { sincronizarMatching } from "@/lib/sincronizar-matching";
import { apenasDigitos } from "@/lib/validacao";

export type EstadoAcao = { erro?: string; erros?: Record<string, string>; sucesso?: string };

const TIPOS_PORTO: TipoPorto[] = ["IGREJA", "ESCOLA", "ASSOCIACAO", "INICIATIVA", "OUTRO"];
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
  const data = /^\d{4}-\d{2}-\d{2}$/.test(dataTexto) ? new Date(`${dataTexto}T00:00:00Z`) : null;
  if (!data || Number.isNaN(data.getTime())) erros.dataRealizacao = "Informe a data de realização.";
  else if (data.getTime() > Date.now()) erros.dataRealizacao = "A data não pode estar no futuro.";
  if (!modalidade) erros.modalidade = "Escolha a modalidade.";
  if (Object.keys(erros).length) return { erros };

  try {
    await db.cursoRealizado.create({
      data: {
        id: randomUUID(),
        naveganteId,
        curso,
        descricao,
        cargaHoraria,
        instituicao,
        dataRealizacao: data!,
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
  const vagaId = texto(formData, "vagaId");
  const escolhida = await db.vagaNavegante.findUnique({ where: { naveganteId_vagaId: { naveganteId, vagaId } } });
  if (escolhida) {
    await db.vagaNavegante.delete({ where: { naveganteId_vagaId: { naveganteId, vagaId } } });
  } else {
    const vaga = await db.vaga.findFirst({ where: { id: vagaId, ativa: true }, select: { id: true } });
    if (vaga) await db.vagaNavegante.create({ data: { naveganteId, vagaId } });
  }
  revalidatePath("/navegante");
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
