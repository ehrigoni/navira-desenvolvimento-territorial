import { test } from "node:test";
import assert from "node:assert/strict";
import { formatarQuantidade, quantidadeColaboracao } from "./colaboracoes";

test("valida quantidades positivas com até duas casas decimais e limite do banco", () => {
  for (const invalido of ["", "0", "-1", "1.001", "10000000000", "1e2", "abc", "Infinity"]) {
    assert.equal(quantidadeColaboracao(invalido), null, invalido);
  }
  assert.equal(quantidadeColaboracao("12,50")?.toString(), "12.5");
  assert.equal(quantidadeColaboracao("9999999999.99")?.toString(), "9999999999.99");
  assert.equal(formatarQuantidade("1234.5"), "1.234,5");
});
