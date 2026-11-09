"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { db } from "@/lib/db";
import { quantidadeColaboracao } from "@/lib/colaboracoes";
import { registrarColaboracao } from "@/lib/registrar-colaboracao";

export type EstadoColaboracao = { erro?: string; sucesso?: string };

function texto(form: FormData, campo: string) {
  const valor = form.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function atualizar() {
  revalidatePath("/porto");
  revalidatePath("/navegante");
}

export async function criarMeta(_: EstadoColaboracao, form: FormData): Promise<EstadoColaboracao> {
  const sessao = await exigirSessao("PORTO");
  const iniciativaId = texto(form, "iniciativaId");
  const tipo = texto(form, "tipo");
  const unidade = texto(form, "unidade");
  const meta = quantidadeColaboracao(form.get("meta"));
  if (!tipo || tipo.length > 100 || !unidade || unidade.length > 50 || !meta) {
    return { erro: "Informe tipo, unidade e uma meta positiva com até duas casas decimais." };
  }
  const iniciativa = await db.iniciativaPorto.findFirst({
    where: { id: iniciativaId, Porto: { usuarioId: sessao.sub }, status: "ABERTO" },
    select: { id: true },
  });
  if (!iniciativa) return { erro: "Iniciativa indisponível ou sem permissão para adicionar metas." };
  await db.metaColaboracao.create({ data: { iniciativaId, tipo, unidade, meta } });
  atualizar();
  return { sucesso: "Meta adicionada." };
}

async function registrar(form: FormData, papel: "PORTO" | "NAVEGANTE"): Promise<EstadoColaboracao> {
  const sessao = await exigirSessao(papel);
  const metaId = texto(form, "metaId");
  const quantidade = quantidadeColaboracao(form.get("quantidade"));
  if (!metaId || !quantidade) return { erro: "Informe uma quantidade positiva com até duas casas decimais." };
  const identidade = papel === "PORTO"
    ? await db.porto.findUnique({ where: { usuarioId: sessao.sub }, select: { id: true } })
    : await db.navegante.findUnique({ where: { usuarioId: sessao.sub }, select: { id: true } });
  if (!identidade) return { erro: "Não foi possível identificar o apoiador." };
  if (!await registrarColaboracao(metaId, quantidade, { papel, id: identidade.id })) {
    return { erro: "Meta indisponível ou sem permissão para colaborar nesta iniciativa." };
  }
  atualizar();
  return { sucesso: "Contribuição declarada; aguarde a confirmação do Porto." };
}

export async function contribuirComoPorto(_: EstadoColaboracao, form: FormData): Promise<EstadoColaboracao> {
  return registrar(form, "PORTO");
}

export async function contribuirComoNavegante(_: EstadoColaboracao, form: FormData): Promise<EstadoColaboracao> {
  return registrar(form, "NAVEGANTE");
}

export async function decidirContribuicao(_: EstadoColaboracao, form: FormData): Promise<EstadoColaboracao> {
  const sessao = await exigirSessao("PORTO");
  const id = texto(form, "contribuicaoId");
  const decisao = texto(form, "decisao");
  if (!id || (decisao !== "CONFIRMADA" && decisao !== "RECUSADA")) return { erro: "Decisão inválida." };
  const resultado = await db.contribuicaoIniciativa.updateMany({
    where: { id, status: "PENDENTE", meta: { iniciativa: { Porto: { usuarioId: sessao.sub } } } },
    data: { status: decisao, decididaEm: new Date() },
  });
  if (!resultado.count) return { erro: "Contribuição indisponível ou já analisada." };
  atualizar();
  return { sucesso: decisao === "CONFIRMADA" ? "Contribuição confirmada." : "Contribuição recusada." };
}
