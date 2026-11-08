import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { QuestaoEthos } from "./questionario-ethos";
import { validarBloco } from "./validacao-ethos";

const multipla: QuestaoEthos = {
  id: "QX.1",
  pergunta: "Quais opções se aplicam?",
  tipo: "multipla",
  opcoes: ["A", "B", "C", "Nenhum"],
  maxSelecoes: 2,
};

describe("validarBloco: múltipla escolha", () => {
  it("aceita uma opção válida, sem exigir todas", () => {
    assert.deepEqual(validarBloco([multipla], { "QX.1": ["A"] }), {});
  });

  it("aceita duas opções dentro do máximo", () => {
    assert.deepEqual(validarBloco([multipla], { "QX.1": ["A", "C"] }), {});
  });

  it("rejeita nenhuma opção selecionada", () => {
    assert.match(validarBloco([multipla], { "QX.1": [] })["QX.1"], /pelo menos uma/);
  });

  it("rejeita mais opções que o máximo", () => {
    assert.match(validarBloco([multipla], { "QX.1": ["A", "B", "C"] })["QX.1"], /no máximo 2/);
  });

  it("rejeita opção que não existe na pergunta", () => {
    assert.match(validarBloco([multipla], { "QX.1": ["A", "Z"] })["QX.1"], /inválidas/);
  });

  it("“Nenhum” não pode ser combinado com outras opções", () => {
    assert.match(validarBloco([multipla], { "QX.1": ["Nenhum", "A"] })["QX.1"], /Nenhum/);
  });

  it("“Nenhum” sozinho é aceito", () => {
    assert.deepEqual(validarBloco([multipla], { "QX.1": ["Nenhum"] }), {});
  });
});

describe("validarBloco: campos obrigatórios e condicionais", () => {
  const filhos: QuestaoEthos = { id: "QX.2", pergunta: "Filhos?", tipo: "booleano" };
  const quantidade: QuestaoEthos = {
    id: "QX.3",
    pergunta: "Quantos?",
    tipo: "numero",
    dependeDe: { id: "QX.2", valor: "Sim" },
  };

  it("exige resposta em campo obrigatório", () => {
    assert.match(validarBloco([filhos], {})["QX.2"], /obrigatória/);
  });

  it("não exige pergunta condicional oculta", () => {
    assert.deepEqual(validarBloco([filhos, quantidade], { "QX.2": "Não" }), {});
  });

  it("exige pergunta condicional quando visível e valida o número", () => {
    assert.match(validarBloco([filhos, quantidade], { "QX.2": "Sim", "QX.3": "0" })["QX.3"], /entre 1 e 30/);
    assert.deepEqual(validarBloco([filhos, quantidade], { "QX.2": "Sim", "QX.3": "2" }), {});
  });
});
