import { test } from "node:test";
import assert from "node:assert/strict";
import { cnpjValido, dataCalendario, detalhesVaga } from "./dados-porto";
import { descricaoCnae } from "./cnae";

test("valida CNPJ com e sem máscara e rejeita dígitos inválidos", () => {
  assert.equal(cnpjValido("11.222.333/0001-81"), true);
  assert.equal(cnpjValido("11222333000181"), true);
  assert.equal(cnpjValido("11.222.333/0001-80"), false);
  assert.equal(cnpjValido("00.000.000/0000-00"), false);
});

test("valida datas reais e aceita campos opcionais", () => {
  assert.equal(dataCalendario(""), null);
  assert.equal(dataCalendario("2024-02-29")?.toString(), new Date("2024-02-29T00:00:00Z").toString());
  assert.equal(dataCalendario("2026-02-29"), false);
  assert.equal(dataCalendario("2026-13-01"), false);
});

test("interpreta detalhes de vaga sem alterar registros antigos", () => {
  assert.deepEqual(detalhesVaga({ requisitos: "Experiência", expectativas: "Colaboração" }), { requisitos: "Experiência", expectativas: "Colaboração" });
  assert.deepEqual(detalhesVaga(["legado"]), { requisitos: "", expectativas: "" });
  assert.deepEqual(detalhesVaga(null), { requisitos: "", expectativas: "" });
});

test("consulta CNAE de sete dígitos com e sem máscara no catálogo", () => {
  assert.equal(descricaoCnae("01113-01"), "CULTIVO DE ARROZ");
  assert.equal(descricaoCnae("0111301"), "CULTIVO DE ARROZ");
  assert.equal(descricaoCnae("0000000"), null);
  assert.equal(descricaoCnae("01113"), null);
  assert.equal(descricaoCnae("x0111301"), null);
});
