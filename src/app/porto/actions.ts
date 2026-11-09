"use server";

import { randomUUID } from "node:crypto";
import { TipoPagamentoPorto } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { confirmarPagamentoPorto } from "@/lib/pagamento-porto";
import { transferirCreditosPorto } from "@/lib/creditos-porto";
import { encerrarContratacao, selecionarCandidato } from "@/lib/contratacao-porto";
import { cnpjValido } from "@/lib/dados-porto";
import { dataCalendario } from "@/lib/data";
import { apenasDigitos } from "@/lib/validacao";
import { sincronizarMatching } from "@/lib/sincronizar-matching";
import { descricaoCnae } from "@/lib/cnae";
import {
  MODALIDADES_FORMULARIO,
  categoriaIniciativaCadastravel,
  VALOR_COTA_APOIO_CENTAVOS,
  VALOR_CREDITO_CONTRATACAO_CENTAVOS,
} from "@/lib/porto-regras";

export type EstadoAcao = { erro?: string; erros?: Record<string, string>; sucesso?: string };

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
  return dataCalendario(texto(formData, chave));
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

export async function consultarCnae(codigo: string): Promise<string | null> {
  await portoPorSessao();
  return descricaoCnae(codigo);
}

export async function atualizarDadosPorto(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const porto = await portoPorSessao();
  const nome = texto(formData, "nome");
  const razaoSocial = texto(formData, "razaoSocial");
  const cnpjInformado = texto(formData, "cnpj");
  const cnpj = apenasDigitos(cnpjInformado);
  const cnaeInformado = texto(formData, "cnae");
  const cnae = apenasDigitos(cnaeInformado);
  const cepInformado = texto(formData, "cep");
  const cep = apenasDigitos(cepInformado);
  const cidade = texto(formData, "cidade");
  const uf = texto(formData, "uf").toUpperCase();
  const logradouro = texto(formData, "logradouro");
  const numeroEndereco = texto(formData, "numero");
  const complemento = texto(formData, "complemento");
  const bairro = texto(formData, "bairro");
  const erros: Record<string, string> = {};

  if (!nome) erros.nome = "Informe o nome do porto.";
  if (cnpjInformado && (!/^[\d./-]+$/.test(cnpjInformado) || !cnpjValido(cnpj))) erros.cnpj = "Informe um CNPJ válido.";
  if (cnaeInformado && (!/^[\d./-]+$/.test(cnaeInformado) || !/^\d{7}$/.test(cnae))) erros.cnae = "Informe o CNAE com 7 dígitos.";
  if (!/^[\d-]+$/.test(cepInformado) || !/^\d{8}$/.test(cep)) erros.cep = "Informe um CEP válido com 8 dígitos.";
  if (!cidade) erros.cidade = "Informe a cidade.";
  if (!/^[A-Z]{2}$/.test(uf)) erros.uf = "Informe a UF com 2 letras.";
  if (Object.keys(erros).length) return { erros };

  try {
    await db.$transaction(async (tx) => {
      await tx.porto.update({
        where: { id: porto.id },
        data: {
          nome, razaoSocial: razaoSocial || null, cnpj: cnpj || null, cnae: cnae || null,
          cep, cidade, uf, logradouro: logradouro || null, numero: numeroEndereco || null,
          complemento: complemento || null, bairro: bairro || null,
          ...(cep !== porto.cep || cidade !== porto.cidade || uf !== porto.uf
            || logradouro !== (porto.logradouro ?? "") || numeroEndereco !== (porto.numero ?? "")
            ? { latitude: null, longitude: null } : {}),
        },
      });
      if (porto.cep !== cep) {
        await tx.vaga.updateMany({ where: { portoId: porto.id, cep: porto.cep }, data: { cep } });
        await tx.curso.updateMany({ where: { portoId: porto.id, cep: porto.cep }, data: { cep } });
      }
      if (porto.cep !== cep || porto.cidade !== cidade || porto.uf !== uf) {
        const inscritos = await tx.inscricaoPorto.findMany({ where: { portoId: porto.id }, select: { naveganteId: true } });
        for (const inscrito of inscritos) await sincronizarMatching(inscrito.naveganteId, tx);
      }
    });
  } catch (e) {
    console.error("[porto] falha ao atualizar dados", e);
    return { erro: "Não foi possível atualizar os dados do porto. Tente novamente." };
  }
  atualizarPainel();
  return { sucesso: "Dados do porto atualizados." };
}

// ---------- Vagas ----------

export async function publicarVaga(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const porto = await portoPorSessao();
  const titulo = texto(formData, "titulo");
  const descricao = texto(formData, "descricao");
  const quantidade = numero(formData, "quantidade") ?? 1;
  const minimo = numero(formData, "salarioMin");
  const maximo = numero(formData, "salarioMax");
  const requisitos = texto(formData, "requisitos");
  const expectativas = texto(formData, "expectativas");
  const beneficios = texto(formData, "beneficios").split("\n").map((item) => item.trim()).filter(Boolean);
  const cursosIds = [...new Set(formData.getAll("cursos").filter((item): item is string => typeof item === "string"))];

  const erros: Record<string, string> = {};
  if (!titulo) erros.titulo = "Informe o cargo.";
  if (!descricao) erros.descricao = "Descreva a vaga e o que a pessoa vai fazer.";
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999) erros.quantidade = "Informe quantas pessoas a vaga comporta (1 a 999).";
  if ((minimo !== undefined && Number.isNaN(minimo)) || (maximo !== undefined && Number.isNaN(maximo))) {
    erros.salario = "Informe valores numéricos para o salário.";
  } else if ((minimo !== undefined && (minimo < 0 || minimo > 21_474_836)) || (maximo !== undefined && (maximo < 0 || maximo > 21_474_836))) {
    erros.salario = "Informe salários entre R$ 0,00 e R$ 21.474.836,00.";
  } else if (minimo !== undefined && maximo !== undefined && minimo > maximo) {
    erros.salario = "O salário mínimo não pode ser maior que o máximo.";
  }
  if (cursosIds.length > 100) erros.cursos = "Selecione no máximo 100 cursos.";
  if (Object.keys(erros).length) return { erros };

  try {
    if (cursosIds.length && await db.curso.count({ where: { id: { in: cursosIds } } }) !== cursosIds.length) {
      return { erros: { cursos: "Um dos cursos selecionados não está mais disponível. Atualize a página." } };
    }
    await db.vaga.create({
      data: {
        portoId: porto.id,
        titulo,
        descricao,
        requisitos: requisitos || expectativas ? { requisitos, expectativas } : undefined,
        quantidade,
        salarioMinCentavos: minimo === undefined ? null : Math.round(minimo * 100),
        salarioMaxCentavos: maximo === undefined ? null : Math.round(maximo * 100),
        cep: porto.cep,
        valoresEthos: [],
        beneficios,
        cursos: { create: cursosIds.map((cursoId) => ({ curso: { connect: { id: cursoId } } })) },
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
 * Quando as contratações atingem a quantidade da vaga, ela é encerrada.
 */
export async function contratarCandidato(formData: FormData) {
  const porto = await portoPorSessao();
  const vagaId = texto(formData, "vagaId");
  const naveganteId = texto(formData, "naveganteId");

  let resultado: string;
  try {
    resultado = await selecionarCandidato(porto.id, vagaId, naveganteId);
  } catch (e) {
    console.error("[porto] falha ao contratar", e);
    resultado = "erro";
  }

  atualizarPainel();
  redirect(`/porto?aviso=${resultado}`);
}

export async function encerrarVinculoCandidato(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const porto = await portoPorSessao();
  const motivo = texto(formData, "motivo");
  if (motivo.length > 1000) return { erro: "O motivo deve ter no máximo 1.000 caracteres." };
  let resultado: string;
  try {
    resultado = await encerrarContratacao(porto.id, texto(formData, "contratacaoId"), motivo);
  } catch (e) {
    console.error("[porto] falha ao encerrar vínculo", e);
    return { erro: "Não foi possível encerrar o vínculo. Tente novamente." };
  }
  if (resultado !== "vinculo-encerrado") return { erro: "Vínculo não encontrado ou já encerrado." };
  atualizarPainel();
  redirect("/porto?aviso=vinculo-encerrado#candidatos-do-porto");
}

// ---------- Cursos ----------

export async function publicarCurso(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const porto = await portoPorSessao();
  const nome = texto(formData, "nome");
  const descricao = texto(formData, "descricao");
  const cargaHoraria = numero(formData, "cargaHoraria");
  const instituicaoEnsino = texto(formData, "instituicaoEnsino");
  const modalidade = MODALIDADES_FORMULARIO[texto(formData, "modalidade")];
  const inicio = data(formData, "inicio");
  const termino = data(formData, "termino");
  const vagasDisponiveis = numero(formData, "vagasDisponiveis");

  const erros: Record<string, string> = {};
  if (!nome) erros.nome = "Informe o nome do curso.";
  if (cargaHoraria === undefined || !Number.isInteger(cargaHoraria) || cargaHoraria < 1 || cargaHoraria > 5000) erros.cargaHoraria = "Informe a carga horária em horas.";
  if (!instituicaoEnsino) erros.instituicaoEnsino = "Informe a instituição que oferece o curso.";
  if (!modalidade) erros.modalidade = "Escolha a modalidade.";
  if (inicio === false) erros.inicio = "Informe uma data de início válida (DD/MM/AAAA).";
  if (termino === false) erros.termino = "Informe uma data de término válida (DD/MM/AAAA).";
  if (inicio && termino && termino < inicio) erros.termino = "O término não pode ser antes do início.";
  if (vagasDisponiveis !== undefined && (!Number.isInteger(vagasDisponiveis) || vagasDisponiveis < 1 || vagasDisponiveis > 1_000_000)) {
    erros.vagasDisponiveis = "Informe uma quantidade entre 1 e 1.000.000.";
  }
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
        inicio: inicio || null,
        termino: termino || null,
        vagasDisponiveis: vagasDisponiveis ?? null,
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
  const categoria = texto(formData, "categoria");
  const titulo = texto(formData, "titulo");
  const descricao = texto(formData, "descricao");
  const modalidade = MODALIDADES_FORMULARIO[texto(formData, "modalidade")];
  const vagasTotais = numero(formData, "vagasTotais");
  const inicio = data(formData, "inicio");
  const termino = data(formData, "termino");

  const erros: Record<string, string> = {};
  if (!categoriaIniciativaCadastravel(categoria)) erros.categoria = "Escolha uma categoria disponível.";
  if (!titulo) erros.titulo = "Informe o título da iniciativa.";
  if (!descricao) erros.descricao = "Descreva a iniciativa.";
  if (!modalidade) erros.modalidade = "Escolha a modalidade.";
  if (vagasTotais !== undefined && (!Number.isInteger(vagasTotais) || vagasTotais < 1)) erros.vagasTotais = "Informe um número de vagas válido.";
  if (inicio === false) erros.inicio = "Informe uma data de início válida (DD/MM/AAAA).";
  if (termino === false) erros.termino = "Informe uma data de término válida (DD/MM/AAAA).";
  if (inicio && termino && termino < inicio) erros.termino = "O término não pode ser antes do início.";
  if (Object.keys(erros).length || !categoriaIniciativaCadastravel(categoria)) return { erros };

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

export async function deixarApoioIniciativaPorto(formData: FormData) {
  const porto = await portoPorSessao();
  const iniciativaId = texto(formData, "iniciativaId");
  const iniciativa = await db.iniciativaPorto.findFirst({
    where: { id: iniciativaId, status: "ABERTO", portoId: { not: porto.id } },
    select: { id: true },
  });
  if (!iniciativa) throw new Error("Iniciativa indisponível para alterar o apoio.");
  await db.apoioIniciativa.deleteMany({ where: { iniciativaId, portoId: porto.id } });
  atualizarPainel();
}

// ---------- Apadrinhamento e cotas ----------

export type PortoBeneficiarioEncontrado = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};

export async function buscarPortosBeneficiarios(termo: string): Promise<PortoBeneficiarioEncontrado[]> {
  const porto = await portoPorSessao();
  const busca = termo.trim();
  if (busca.length < 2) return [];
  return db.porto.findMany({
    where: { id: { not: porto.id }, nome: { contains: busca, mode: "insensitive" }, aprovacaoPendente: false, status: { in: ["ATIVO", "EM_ANALISE"] } },
    select: { id: true, nome: true, cidade: true, uf: true, cep: true },
    orderBy: [{ nome: "asc" }, { id: "asc" }],
    take: 20,
  });
}

export async function adicionarBeneficiario(afilhadoId: string): Promise<{ erro?: string }> {
  const porto = await portoPorSessao();
  if (!afilhadoId || afilhadoId === porto.id) return { erro: "Escolha outro porto." };
  const afilhado = await db.porto.findFirst({ where: { id: afilhadoId, aprovacaoPendente: false, status: { in: ["ATIVO", "EM_ANALISE"] } }, select: { id: true } });
  if (!afilhado) return { erro: "Porto beneficiário não encontrado." };
  await db.apadrinhamento.upsert({
    where: { padrinhoId_afilhadoId: { padrinhoId: porto.id, afilhadoId } },
    create: { padrinhoId: porto.id, afilhadoId },
    update: {},
  });
  atualizarPainel();
  return {};
}

export async function removerBeneficiario(formData: FormData) {
  const porto = await portoPorSessao();
  const removido = await db.apadrinhamento.deleteMany({
    where: { padrinhoId: porto.id, afilhadoId: texto(formData, "afilhadoId"), cotas: 0 },
  });
  if (!removido.count) redirect("/porto?aviso=remocao-beneficiario#outros-portos");
  atualizarPainel();
}

/** Cria uma cobrança de vagas para o próprio porto ou para outro porto. */
export async function comprarCotas(formData: FormData) {
  const porto = await portoPorSessao();
  const afilhadoId = texto(formData, "afilhadoId");
  const quantidade = numero(formData, "quantidade");
  if (quantidade === undefined || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100) redirect("/porto?aviso=quantidade-invalida");

  if (afilhadoId && afilhadoId !== porto.id) {
    const afilhado = await db.porto.findFirst({ where: { id: afilhadoId, aprovacaoPendente: false, status: { in: ["ATIVO", "EM_ANALISE"] } }, select: { id: true } });
    if (!afilhado) redirect("/porto?aviso=porto-invalido");
  }

  await db.pagamentoPorto.create({
    data: {
      portoId: porto.id,
      afilhadoId: afilhadoId && afilhadoId !== porto.id ? afilhadoId : null,
      tipo: afilhadoId && afilhadoId !== porto.id ? TipoPagamentoPorto.COTA_APOIO : TipoPagamentoPorto.CREDITO_CONTRATACAO,
      quantidade,
      valorCentavos: quantidade * VALOR_COTA_APOIO_CENTAVOS,
    },
  });
  atualizarPainel();
  redirect("/porto?aviso=cobranca-criada#pagamentos");
}

/** Transfere créditos já pagos para outro porto. */
export async function doarCotas(formData: FormData) {
  const porto = await portoPorSessao();
  const quantidade = numero(formData, "quantidade");
  if (quantidade === undefined) redirect("/porto?aviso=quantidade-invalida");
  const resultado = await transferirCreditosPorto(porto.id, texto(formData, "afilhadoId"), quantidade);
  atualizarPainel();
  redirect(`/porto?aviso=${resultado === "invalido" ? "transferencia-invalida" : resultado}#outros-portos`);
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
