"use server";

import { randomUUID } from "node:crypto";
import { CategoriaIniciativa, TipoPagamentoPorto } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { confirmarPagamentoPorto } from "@/lib/pagamento-porto";
import {
  assinaturaAtiva,
  MODALIDADES_FORMULARIO,
  VALOR_ASSINATURA_ANUAL_CENTAVOS,
  VALOR_COTA_APOIO_CENTAVOS,
  VALOR_CREDITO_CONTRATACAO_CENTAVOS,
} from "@/lib/porto-regras";

export type EstadoAcao = { erro?: string; erros?: Record<string, string>; sucesso?: string };

const CATEGORIAS: CategoriaIniciativa[] = ["CURSO", "VAGA_EMPREGO", "VOLUNTARIADO", "MUTIRAO", "EVENTO"];

function texto(formData: FormData, chave: string) {
  const valor = formData.get(chave);
  return typeof valor === "string" ? valor.trim() : "";
}

/** Número do formulário: undefined se vazio, NaN se inválido. */
function numero(formData: FormData, chave: string): number | undefined {
  const valor = texto(formData, chave);
  if (valor === "") return undefined;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Data do formulário (AAAA-MM-DD): null se vazia, false se inválida. */
function data(formData: FormData, chave: string): Date | null | false {
  const valor = texto(formData, chave);
  if (valor === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? false : d;
}

async function portoPorSessao() {
  const sessao = await exigirSessao("PORTO");
  const porto = await db.porto.findUnique({ where: { usuarioId: sessao.sub } });
  if (!porto) throw new Error("Porto não encontrado para a sessão.");
  return porto;
}

function atualizarPainel() {
  revalidatePath("/porto");
  revalidatePath("/navegante");
}

// ---------- Vagas ----------

export async function publicarVaga(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const porto = await portoPorSessao();
  const titulo = texto(formData, "titulo");
  const descricao = texto(formData, "descricao");
  const quantidade = numero(formData, "quantidade") ?? 1;
  const minimo = numero(formData, "salarioMin");
  const maximo = numero(formData, "salarioMax");

  const erros: Record<string, string> = {};
  if (!titulo) erros.titulo = "Informe o cargo.";
  if (!descricao) erros.descricao = "Descreva a vaga e o que a pessoa vai fazer.";
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999) erros.quantidade = "Informe quantas pessoas a vaga comporta (1 a 999).";
  if ((minimo !== undefined && Number.isNaN(minimo)) || (maximo !== undefined && Number.isNaN(maximo))) {
    erros.salario = "Informe valores numéricos para o salário.";
  } else if (minimo !== undefined && maximo !== undefined && minimo > maximo) {
    erros.salario = "O salário mínimo não pode ser maior que o máximo.";
  }
  if (Object.keys(erros).length) return { erros };

  try {
    await db.vaga.create({
      data: {
        portoId: porto.id,
        titulo,
        descricao,
        quantidade,
        salarioMinCentavos: minimo === undefined ? null : Math.round(minimo * 100),
        salarioMaxCentavos: maximo === undefined ? null : Math.round(maximo * 100),
        cep: porto.cep,
        valoresEthos: [],
        beneficios: [],
      },
    });
  } catch (e) {
    console.error("[porto] falha ao publicar vaga", e);
    return { erro: "Não foi possível publicar a vaga. Tente novamente." };
  }

  atualizarPainel();
  return { sucesso: "Vaga publicada." };
}

/** Pausa ou reativa uma vaga do próprio porto. */
export async function alternarVagaPorto(formData: FormData) {
  const porto = await portoPorSessao();
  const vaga = await db.vaga.findFirst({ where: { id: texto(formData, "vagaId"), portoId: porto.id }, select: { id: true, ativa: true } });
  if (vaga) await db.vaga.update({ where: { id: vaga.id }, data: { ativa: !vaga.ativa } });
  atualizarPainel();
}

/**
 * Contrata um candidato da vaga. Consome um crédito de contratação do porto.
 * Exige assinatura ativa; quando as contratações atingem a quantidade da vaga, ela é encerrada.
 */
export async function contratarCandidato(formData: FormData) {
  const porto = await portoPorSessao();
  const vagaId = texto(formData, "vagaId");
  const naveganteId = texto(formData, "naveganteId");

  const vaga = await db.vaga.findFirst({ where: { id: vagaId, portoId: porto.id, ativa: true }, select: { id: true, quantidade: true } });
  if (!vaga) redirect("/porto?aviso=vaga-indisponivel");

  const candidato = await db.vagaNavegante.findUnique({ where: { naveganteId_vagaId: { naveganteId, vagaId } }, select: { naveganteId: true } });
  if (!candidato) redirect("/porto?aviso=sem-candidato");

  const jaContratado = await db.contratacao.findUnique({ where: { vagaId_naveganteId: { vagaId, naveganteId } }, select: { id: true } });
  if (jaContratado) redirect("/porto?aviso=ja-contratado");

  if (!assinaturaAtiva(porto)) redirect("/porto?aviso=assinatura-vencida");

  let resultado: string;
  try {
    resultado = await db.$transaction(async (tx) => {
      // updateMany com condição: duas contratações simultâneas não consomem o mesmo crédito.
      const debito = await tx.porto.updateMany({
        where: { id: porto.id, creditosContratacao: { gt: 0 } },
        data: { creditosContratacao: { decrement: 1 } },
      });
      if (debito.count === 0) return "sem-credito";

      await tx.contratacao.create({
        data: { portoId: porto.id, naveganteId, vagaId, valorCentavos: VALOR_CREDITO_CONTRATACAO_CENTAVOS },
      });
      const total = await tx.contratacao.count({ where: { vagaId } });
      if (total >= vaga.quantidade) await tx.vaga.update({ where: { id: vagaId }, data: { ativa: false } });
      return "contratado";
    });
  } catch (e) {
    console.error("[porto] falha ao contratar", e);
    resultado = "erro";
  }

  atualizarPainel();
  redirect(`/porto?aviso=${resultado}`);
}

// ---------- Cursos ----------

export async function publicarCurso(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const porto = await portoPorSessao();
  const nome = texto(formData, "nome");
  const descricao = texto(formData, "descricao");
  const cargaHoraria = numero(formData, "cargaHoraria");
  const instituicaoEnsino = texto(formData, "instituicaoEnsino");
  const modalidade = MODALIDADES_FORMULARIO[texto(formData, "modalidade")];

  const erros: Record<string, string> = {};
  if (!nome) erros.nome = "Informe o nome do curso.";
  if (cargaHoraria === undefined || !Number.isInteger(cargaHoraria) || cargaHoraria < 1 || cargaHoraria > 5000) erros.cargaHoraria = "Informe a carga horária em horas.";
  if (!instituicaoEnsino) erros.instituicaoEnsino = "Informe a instituição que oferece o curso.";
  if (!modalidade) erros.modalidade = "Escolha a modalidade.";
  if (Object.keys(erros).length) return { erros };

  try {
    await db.curso.create({
      data: {
        portoId: porto.id,
        nome,
        descricao: descricao || null,
        cargaHorariaHoras: cargaHoraria as number,
        modalidade,
        instituicaoEnsino,
        cep: porto.cep,
        valoresEthos: [],
      },
    });
  } catch (e) {
    console.error("[porto] falha ao publicar curso", e);
    return { erro: "Não foi possível cadastrar o curso. Tente novamente." };
  }

  atualizarPainel();
  return { sucesso: "Curso cadastrado." };
}

export async function removerCursoPorto(formData: FormData) {
  const porto = await portoPorSessao();
  await db.curso.deleteMany({ where: { id: texto(formData, "cursoId"), portoId: porto.id } });
  atualizarPainel();
}

// ---------- Iniciativas ----------

export async function publicarIniciativa(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const porto = await portoPorSessao();
  const categoria = texto(formData, "categoria") as CategoriaIniciativa;
  const titulo = texto(formData, "titulo");
  const descricao = texto(formData, "descricao");
  const modalidade = MODALIDADES_FORMULARIO[texto(formData, "modalidade")];
  const vagasTotais = numero(formData, "vagasTotais");
  const inicio = data(formData, "inicio");
  const termino = data(formData, "termino");

  const erros: Record<string, string> = {};
  if (!CATEGORIAS.includes(categoria)) erros.categoria = "Escolha a categoria.";
  if (!titulo) erros.titulo = "Informe o título da iniciativa.";
  if (!descricao) erros.descricao = "Descreva a iniciativa.";
  if (!modalidade) erros.modalidade = "Escolha a modalidade.";
  if (vagasTotais !== undefined && (!Number.isInteger(vagasTotais) || vagasTotais < 1)) erros.vagasTotais = "Informe um número de vagas válido.";
  if (inicio === false) erros.inicio = "Data de início inválida.";
  if (termino === false) erros.termino = "Data de término inválida.";
  if (inicio && termino && termino < inicio) erros.termino = "O término não pode ser antes do início.";
  if (Object.keys(erros).length) return { erros };

  try {
    await db.iniciativaPorto.create({
      data: {
        id: randomUUID(),
        portoId: porto.id,
        categoria,
        titulo,
        descricao,
        modalidade,
        vagasTotais: vagasTotais === undefined ? null : vagasTotais,
        inicio: inicio || null,
        termino: termino || null,
        atualizadaEm: new Date(),
      },
    });
  } catch (e) {
    console.error("[porto] falha ao cadastrar iniciativa", e);
    return { erro: "Não foi possível cadastrar a iniciativa. Tente novamente." };
  }

  atualizarPainel();
  return { sucesso: "Iniciativa cadastrada." };
}

/** Encerra ou reabre uma iniciativa do próprio porto. */
export async function alternarIniciativaPorto(formData: FormData) {
  const porto = await portoPorSessao();
  const iniciativa = await db.iniciativaPorto.findFirst({ where: { id: texto(formData, "iniciativaId"), portoId: porto.id }, select: { id: true, status: true } });
  if (iniciativa) {
    await db.iniciativaPorto.update({
      where: { id: iniciativa.id },
      data: { status: iniciativa.status === "ENCERRADO" ? "ABERTO" : "ENCERRADO", atualizadaEm: new Date() },
    });
  }
  atualizarPainel();
}

/** Coloca o porto na lista de apoiadores de uma iniciativa de outro porto (ou tira). */
export async function alternarApoioIniciativaPorto(formData: FormData) {
  const porto = await portoPorSessao();
  const iniciativaId = texto(formData, "iniciativaId");
  const iniciativa = await db.iniciativaPorto.findFirst({
    where: { id: iniciativaId, status: "ABERTO", portoId: { not: porto.id } },
    select: { id: true },
  });
  if (iniciativa) {
    const removido = await db.apoioIniciativa.deleteMany({ where: { iniciativaId, portoId: porto.id } });
    if (removido.count === 0) await db.apoioIniciativa.create({ data: { iniciativaId, portoId: porto.id } });
  }
  atualizarPainel();
}

// ---------- Apadrinhamento e cotas ----------

/** Apadrinha outro porto. Vincular não cobra nada; as cotas são compradas à parte. */
export async function apadrinhar(formData: FormData) {
  const porto = await portoPorSessao();
  const afilhadoId = texto(formData, "afilhadoId");
  if (!afilhadoId || afilhadoId === porto.id) return;

  const afilhado = await db.porto.findUnique({ where: { id: afilhadoId }, select: { id: true } });
  if (afilhado) {
    await db.apadrinhamento.upsert({
      where: { padrinhoId_afilhadoId: { padrinhoId: porto.id, afilhadoId } },
      create: { padrinhoId: porto.id, afilhadoId },
      update: {},
    });
  }
  atualizarPainel();
}

/** Deixa de apadrinhar. Só é possível se nenhuma cota foi paga para o porto. */
export async function desapadrinhar(formData: FormData) {
  const porto = await portoPorSessao();
  await db.apadrinhamento.deleteMany({
    where: { padrinhoId: porto.id, afilhadoId: texto(formData, "afilhadoId"), cotas: 0 },
  });
  atualizarPainel();
}

/** Cria a cobrança de cotas de apoio a um porto apadrinhado. As cotas valem após o pagamento. */
export async function comprarCotas(formData: FormData) {
  const porto = await portoPorSessao();
  const afilhadoId = texto(formData, "afilhadoId");
  const quantidade = numero(formData, "quantidade");
  if (quantidade === undefined || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100) return;

  const apadrinhamento = await db.apadrinhamento.findUnique({
    where: { padrinhoId_afilhadoId: { padrinhoId: porto.id, afilhadoId } },
    select: { padrinhoId: true },
  });
  if (!apadrinhamento) return;

  await db.pagamentoPorto.create({
    data: {
      portoId: porto.id,
      afilhadoId,
      tipo: TipoPagamentoPorto.COTA_APOIO,
      quantidade,
      valorCentavos: quantidade * VALOR_COTA_APOIO_CENTAVOS,
    },
  });
  atualizarPainel();
}

// ---------- Assinatura e crédito de contratação ----------

/** Cria a cobrança da assinatura anual ou de um crédito de contratação. */
export async function criarCobrancaPorto(formData: FormData) {
  const porto = await portoPorSessao();
  const tipo = texto(formData, "tipo");
  if (tipo === "ASSINATURA_ANUAL") {
    await db.pagamentoPorto.create({ data: { portoId: porto.id, tipo, valorCentavos: VALOR_ASSINATURA_ANUAL_CENTAVOS } });
  } else if (tipo === "CREDITO_CONTRATACAO") {
    await db.pagamentoPorto.create({ data: { portoId: porto.id, tipo, valorCentavos: VALOR_CREDITO_CONTRATACAO_CENTAVOS } });
  }
  atualizarPainel();
}

/**
 * Confirma uma cobrança sem gateway de pagamento. Só existe fora de produção, para testar o fluxo.
 * Em produção, a confirmação deve vir do gateway chamando confirmarPagamentoPorto.
 */
export async function simularPagamento(formData: FormData) {
  if (process.env.NODE_ENV === "production") throw new Error("Simulação de pagamento indisponível em produção.");
  const porto = await portoPorSessao();
  const pagamento = await db.pagamentoPorto.findFirst({ where: { id: texto(formData, "pagamentoId"), portoId: porto.id }, select: { id: true } });
  if (pagamento) await confirmarPagamentoPorto(pagamento.id);
  atualizarPainel();
}
