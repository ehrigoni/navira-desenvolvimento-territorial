import assert from "node:assert/strict";
import { test } from "node:test";
import { INDICES_IMPACTO } from "./indices-impacto";

test("apresenta os quatro índices e seus pesos conforme a especificação", () => {
  assert.deepEqual(INDICES_IMPACTO.map(({ sigla, peso }) => [sigla, peso]), [
    ["IIP", "30%"], ["IME", "35%"], ["IDT", "20%"], ["IRES", "15%"],
  ]);
  assert.deepEqual(INDICES_IMPACTO.map(({ indicadores }) => indicadores.length), [4, 4, 6, 6]);
  assert.deepEqual(INDICES_IMPACTO.map(({ indicadores }) => indicadores.filter((i) => i.peso).map((i) => i.peso)), [
    ["30%", "35%", "35%"], ["40%", "35%", "25%"], ["30%", "40%", "20%"], [],
  ]);
  assert.deepEqual(INDICES_IMPACTO.flatMap((indice) => indice.indicadores.filter((indicador) => indicador.dado).map((indicador) => indicador.dado)), ["pessoasCadastradas"]);
});
