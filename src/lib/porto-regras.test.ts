import { test } from "node:test";
import assert from "node:assert/strict";
import { assinaturaAtiva, proximoVencimentoAssinatura } from "./porto-regras";

const agora = new Date("2026-11-08T12:00:00Z");

test("assinatura sem data ou vencida não está ativa", () => {
  assert.equal(assinaturaAtiva({ assinaturaAteEm: null }, agora), false);
  assert.equal(assinaturaAtiva({ assinaturaAteEm: new Date("2026-11-01T00:00:00Z") }, agora), false);
  assert.equal(assinaturaAtiva({ assinaturaAteEm: new Date("2027-01-01T00:00:00Z") }, agora), true);
});

test("primeira assinatura vence um ano a partir de hoje", () => {
  assert.equal(proximoVencimentoAssinatura(null, agora).toISOString(), "2027-11-08T12:00:00.000Z");
});

test("renovação antes do vencimento soma um ano ao vencimento atual", () => {
  const atual = new Date("2027-03-15T00:00:00Z");
  assert.equal(proximoVencimentoAssinatura(atual, agora).toISOString(), "2028-03-15T00:00:00.000Z");
});

test("renovação depois do vencimento começa de hoje", () => {
  const vencida = new Date("2026-01-10T00:00:00Z");
  assert.equal(proximoVencimentoAssinatura(vencida, agora).toISOString(), "2027-11-08T12:00:00.000Z");
});
