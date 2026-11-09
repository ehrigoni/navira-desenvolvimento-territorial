import { test } from "node:test";
import assert from "node:assert/strict";
import { cnpjValido, detalhesVaga } from "./dados-porto";
import { dataCalendario, mascararData } from "./data";
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
  assert.equal(dataCalendario("29/02/2024")?.toString(), new Date("2024-02-29T00:00:00Z").toString());
  for (const invalida of ["29/02/2026", "31/04/2024", "01/13/2026", "1/01/2026", "01/01/20", "01-01-2026"]) {
    assert.equal(dataCalendario(invalida), false);
  }
});

test("formata digitação e colagem de datas", () => {
  assert.equal(mascararData("1"), "1");
  assert.equal(mascararData("120"), "12/0");
  assert.equal(mascararData("12032026"), "12/03/2026");
  assert.equal(mascararData("12/03/202699"), "12/03/2026");
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
