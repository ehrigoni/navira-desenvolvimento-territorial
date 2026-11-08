"use server";

import { randomUUID } from "node:crypto";
import { ConsentimentoTipo, EthosStatus, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cifrarDadoSensivel } from "@/lib/ethos-crypto";
import { sincronizarMatching } from "@/lib/sincronizar-matching";
import { exigirSessao } from "@/lib/auth";
import {
  BLOCOS_ETHOS,
  VERSAO_QUESTIONARIO_ETHOS,
  valorCondicionalVisivel,
  type QuestaoEthos,
} from "@/lib/questionario-ethos";
import { validarBloco, type Respostas } from "@/lib/validacao-ethos";

export type EstadoBlocoEthos = {
  erro?: string;
  erros?: Record<string, string>;
  recusado?: boolean;
};



// Perguntas de consentimento da etapa 0 e o tipo de consentimento que cada uma registra.
const CONSENTIMENTOS_ETAPA_0 = [
  ["Q0.1", ConsentimentoTipo.PARTICIPACAO],
  ["Q0.2", ConsentimentoTipo.RECOMENDACOES],
  ["Q0.3", ConsentimentoTipo.DADOS_AGREGADOS],
  ["Q0.4", ConsentimentoTipo.CONTATO],
] as const;

// Marcador gravado no lugar de dado sensível: o valor real fica só cifrado em DadosSensiveis.
const MARCADOR_PROTEGIDO = "[PROTEGIDO]";

export async function salvarBlocoEthos(_: EstadoBlocoEthos, formData: FormData): Promise<EstadoBlocoEthos> {
  const sessao = await exigirSessao("NAVEGANTE");
  const navegante = await db.navegante.findUnique({
    where: { usuarioId: sessao.sub },
    select: { id: true, ethosBlocoAtual: true, ethosConcluidoEm: true },
  });
  if (!navegante) redirect("/entrar");
  if (navegante.ethosConcluidoEm) redirect("/navegante");

  const blocoNumero = Number(formData.get("bloco"));
  const bloco = BLOCOS_ETHOS[blocoNumero];
  if (!Number.isInteger(blocoNumero) || !bloco) return { erro: "Bloco do questionário inválido." };

  const blocoAtual = navegante.ethosBlocoAtual;
  if (blocoNumero > blocoAtual) redirect(`/navegante/ethos?bloco=${blocoAtual}`);

  const respostasSalvas = await db.respostaEthos.findMany({
    where: { naveganteId: navegante.id },
    select: { questaoId: true, valor: true },
  });
  const respostas = lerRespostas(respostasSalvas);
  const respostasNovas: Respostas = { ...respostas };
  const consentimentoSensivel: Record<string, boolean> = {};

  for (const questao of bloco.questoes) {
    if (!valorCondicionalVisivel(questao, respostasNovas)) {
      delete respostasNovas[questao.id];
      continue;
    }

    if (questao.tipo === "sensivel") {
      const consentido = formData.get(`consentimento_${questao.id}`) === "sim";
      const valor = texto(formData.get(questao.id));
      consentimentoSensivel[questao.id] = consentido;
      respostasNovas[questao.id] = consentido ? valor : "Prefiro não responder";
      continue;
    }

    const valor = questao.tipo === "multipla"
      ? formData.getAll(questao.id).filter((item): item is string => typeof item === "string")
      : texto(formData.get(questao.id));
    if (valorCondicionalVisivel(questao, respostasNovas)) respostasNovas[questao.id] = valor;
  }

  const intent = formData.get("intent") === "voltar" ? "voltar" : "avancar";
  const erros = intent === "avancar" ? validarBloco(bloco.questoes, respostasNovas) : {};
  if (Object.keys(erros).length) return { erros };

  const recusado = blocoNumero === 0 && respostasNovas["Q0.1"] === "Não";
  const proximoBloco = intent === "voltar"
    ? Math.max(0, blocoNumero - 1)
    : recusado
      ? 0
      : Math.min(BLOCOS_ETHOS.length - 1, blocoNumero + 1);
  const concluiu = !recusado && intent === "avancar" && blocoNumero === BLOCOS_ETHOS.length - 1;

  // Etapa 1: dados sensíveis são cifrados e nunca gravados em claro (nem em RespostaEthos).
  let dadosSensiveis: { racaCorCifrado: string | null; religiaoCifrado: string | null } | null = null;
  if (blocoNumero === 1) {
    const autorizaRaca = consentimentoSensivel["Q1.7"] === true;
    const autorizaReligiao = consentimentoSensivel["Q1.8"] === true;
    try {
      dadosSensiveis = {
        racaCorCifrado: autorizaRaca
          ? cifrarDadoSensivel(String(respostasNovas["Q1.7"] ?? ""), { naveganteId: navegante.id, campo: "racaCor" })
          : null,
        religiaoCifrado: autorizaReligiao
          ? cifrarDadoSensivel(String(respostasNovas["Q1.8"] ?? ""), { naveganteId: navegante.id, campo: "religiao" })
          : null,
      };
    } catch (e) {
      console.error("[ethos] falha ao proteger dados sensíveis", e);
      return { erro: "Não foi possível proteger os dados sensíveis. Verifique a configuração de segurança e tente novamente." };
    }
    for (const [id, autoriza] of [["Q1.7", autorizaRaca], ["Q1.8", autorizaReligiao]] as const) {
      if (autoriza) respostasNovas[id] = MARCADOR_PROTEGIDO;
      else delete respostasNovas[id];
    }
  }

  const agora = new Date();
  try {
    await db.$transaction(async (tx) => {
      // Uma linha por pergunta: grava as visíveis do bloco e remove as ocultas.
      for (const questao of bloco.questoes) {
        const valor = respostasNovas[questao.id];
        if (valor === undefined) {
          await tx.respostaEthos.deleteMany({ where: { naveganteId: navegante.id, questaoId: questao.id } });
          continue;
        }
        await tx.respostaEthos.upsert({
          where: { naveganteId_questaoId: { naveganteId: navegante.id, questaoId: questao.id } },
          create: {
            id: randomUUID(),
            naveganteId: navegante.id,
            bloco: blocoNumero,
            questaoId: questao.id,
            valor: valor as Prisma.InputJsonValue,
            versaoQuestionario: VERSAO_QUESTIONARIO_ETHOS,
            atualizadoEm: agora,
          },
          update: {
            bloco: blocoNumero,
            valor: valor as Prisma.InputJsonValue,
            versaoQuestionario: VERSAO_QUESTIONARIO_ETHOS,
            atualizadoEm: agora,
          },
        });
      }

      // Consentimentos são histórico (append-only): cada etapa validada registra uma nova linha.
      if (intent === "avancar" && blocoNumero === 0) {
        for (const [id, tipo] of CONSENTIMENTOS_ETAPA_0) {
          await tx.consentimento.create({
            data: {
              usuarioId: sessao.sub,
              tipo,
              concedido: respostasNovas[id] === "Sim",
              versaoTermo: VERSAO_QUESTIONARIO_ETHOS,
            },
          });
        }
      }

      if (intent === "avancar" && blocoNumero === 1 && dadosSensiveis) {
        const autorizouAlgo = dadosSensiveis.racaCorCifrado !== null || dadosSensiveis.religiaoCifrado !== null;
        await tx.consentimento.create({
          data: {
            usuarioId: sessao.sub,
            tipo: ConsentimentoTipo.DADOS_SENSIVEIS,
            concedido: autorizouAlgo,
            versaoTermo: VERSAO_QUESTIONARIO_ETHOS,
          },
        });
      }

      if (dadosSensiveis) {
        await tx.dadosSensiveis.upsert({
          where: { naveganteId: navegante.id },
          create: { naveganteId: navegante.id, ...dadosSensiveis },
          update: dadosSensiveis,
        });
      }

      await tx.navegante.update({
        where: { id: navegante.id },
        data: {
          ethosBlocoAtual: recusado ? 0 : proximoBloco,
          ethosStatus: recusado
            ? EthosStatus.NAO_INICIADO
            : concluiu ? EthosStatus.CONCLUIDO : EthosStatus.EM_ANDAMENTO,
          ethosConcluidoEm: concluiu ? agora : undefined,
        },
      });
    });
  } catch (e) {
    console.error("[ethos] falha ao salvar bloco", e);
    return { erro: "Não foi possível salvar suas respostas. Tente novamente." };
  }

  // Mudança de Ethos: regrava o [Matching-Navegante] (só quando concluído, que é quando o perfil fica completo).
  if (concluiu) await sincronizarMatching(navegante.id);

  if (concluiu) redirect("/navegante");
  if (intent === "voltar") redirect(`/navegante/ethos?bloco=${proximoBloco}`);
  if (recusado) return { recusado: true };
  redirect(`/navegante/ethos?bloco=${proximoBloco}`);
}

function texto(valor: FormDataEntryValue | null) {
  return typeof valor === "string" ? valor.trim() : "";
}

function lerRespostas(linhas: { questaoId: string; valor: Prisma.JsonValue }[]): Respostas {
  const resultado: Respostas = {};
  for (const { questaoId, valor } of linhas) {
    if (typeof valor === "string" || (Array.isArray(valor) && valor.every((item) => typeof item === "string"))) {
      resultado[questaoId] = valor as string | string[];
    }
  }
  return resultado;
}

