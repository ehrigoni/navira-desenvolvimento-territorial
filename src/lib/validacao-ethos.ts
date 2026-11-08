import { valorCondicionalVisivel, type QuestaoEthos } from "./questionario-ethos";

export type Respostas = Record<string, string | string[]>;

const OPCOES_BOOLEANAS = ["Sim", "Não"];

export function validarBloco(questoes: readonly QuestaoEthos[], respostas: Respostas) {
  const erros: Record<string, string> = {};

  for (const questao of questoes) {
    if (!valorCondicionalVisivel(questao, respostas)) continue;
    const valor = respostas[questao.id];

    if (questao.tipo === "sensivel") {
      if (typeof valor !== "string" || !questao.opcoes?.includes(valor)) {
        erros[questao.id] = "Selecione uma opção.";
      }
      continue;
    }

    if (questao.tipo === "multipla") {
      if (!Array.isArray(valor) || valor.length === 0) {
        erros[questao.id] = "Selecione pelo menos uma opção.";
      } else if (questao.maxSelecoes && valor.length > questao.maxSelecoes) {
        erros[questao.id] = `Selecione no máximo ${questao.maxSelecoes} opções.`;
      } else if (valor.some((item) => !questao.opcoes?.includes(item))) {
        erros[questao.id] = "Uma ou mais opções são inválidas.";
      } else if (valor.includes("Nenhum") && valor.length > 1) {
        erros[questao.id] = "“Nenhum” não pode ser combinado com outras opções.";
      }
      continue;
    }

    if (typeof valor !== "string" || !valor) {
      erros[questao.id] = "Esta resposta é obrigatória.";
      continue;
    }

    if (questao.tipo === "booleano" && !OPCOES_BOOLEANAS.includes(valor)) {
      erros[questao.id] = "Selecione Sim ou Não.";
    } else if (questao.tipo === "selecao" && !questao.opcoes?.includes(valor)) {
      erros[questao.id] = "Selecione uma opção válida.";
    } else if (questao.tipo === "escala" && (!/^(10|[1-9])$/.test(valor))) {
      erros[questao.id] = "Escolha um valor de 1 a 10.";
    } else if (questao.tipo === "numero") {
      const numero = Number(valor);
      const minimo = 1;
      const maximo = questao.id === "Q1.2" ? 120 : 30;
      if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
        erros[questao.id] = `Informe um número entre ${minimo} e ${maximo}.`;
      }
    } else if (questao.tipo === "renda" && !questao.opcoes?.includes(valor)) {
      erros[questao.id] = "Selecione uma faixa válida.";
    } else if (questao.tipo === "texto" && valor.length > 120) {
      erros[questao.id] = "A resposta deve ter no máximo 120 caracteres.";
    } else if (questao.tipo === "texto_longo" && valor.length > 5000) {
      erros[questao.id] = "A resposta deve ter no máximo 5.000 caracteres.";
    }
  }

  return erros;
}
