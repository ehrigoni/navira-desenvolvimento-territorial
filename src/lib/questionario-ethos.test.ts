import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLOCOS_ETHOS, valorCondicionalVisivel, type QuestaoEthos } from "./questionario-ethos";

const todasQuestoes: QuestaoEthos[] = BLOCOS_ETHOS.flatMap((bloco) => [...bloco.questoes]);

describe("questionário Perfil de Travessia", () => {
  it("não repete IDs de questão", () => {
    const ids = todasQuestoes.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("toda dependência aponta para uma questão anterior existente", () => {
    const vistas = new Set<string>();
    for (const questao of todasQuestoes) {
      if (questao.dependeDe) assert.ok(vistas.has(questao.dependeDe.id), `${questao.id} depende de ${questao.dependeDe.id}`);
      vistas.add(questao.id);
    }
  });

  it("Q1.7 e Q1.8 são sensíveis, com opção de não responder", () => {
    for (const id of ["Q1.7", "Q1.8"]) {
      const questao = todasQuestoes.find((q) => q.id === id);
      assert.equal(questao?.tipo, "sensivel");
      assert.ok(questao?.opcoes?.includes("Prefiro não responder"));
    }
  });

  it("a pergunta de filhos só fica visível quando a resposta é Sim", () => {
    const quantidade = todasQuestoes.find((q) => q.id === "Q1.6_quantidade");
    assert.ok(quantidade);
    assert.equal(valorCondicionalVisivel(quantidade, { "Q1.6": "Sim" }), true);
    assert.equal(valorCondicionalVisivel(quantidade, { "Q1.6": "Não" }), false);
    assert.equal(valorCondicionalVisivel(quantidade, {}), false);
  });
});
