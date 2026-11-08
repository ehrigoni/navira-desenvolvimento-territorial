import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { confirmarPagamentoPorto } from "./pagamento-porto";
import { transferirCreditosPorto } from "./creditos-porto";
import { VALOR_COTA_APOIO_CENTAVOS } from "./porto-regras";

const ids = [randomUUID(), randomUUID(), randomUUID()];

describe("compra e doação de vagas de porto", { skip: !process.env.DATABASE_URL && "DATABASE_URL não configurada" }, () => {
  after(async () => {
    await db.pagamentoPorto.deleteMany({ where: { portoId: { in: ids } } });
    await db.apadrinhamento.deleteMany({ where: { padrinhoId: { in: ids } } });
    await db.porto.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  });

  it("libera créditos para o beneficiário somente após pagamento e permite transferências", async () => {
    await db.porto.createMany({ data: ids.map((id) => ({ id, nome: `Teste ${id}` })) });
    const [pagador, beneficiario, terceiro] = ids;
    const cobranca = await db.pagamentoPorto.create({
      data: { portoId: pagador, afilhadoId: beneficiario, tipo: "COTA_APOIO", quantidade: 3, valorCentavos: 3 * VALOR_COTA_APOIO_CENTAVOS },
    });
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: beneficiario } })).creditosContratacao, 0);
    assert.equal((await confirmarPagamentoPorto(cobranca.id)).aplicado, true);
    assert.equal((await confirmarPagamentoPorto(cobranca.id)).aplicado, false);
    const pagadorAtual = await db.porto.findUniqueOrThrow({ where: { id: pagador } });
    assert.ok(pagadorAtual.assinaturaAteEm && pagadorAtual.assinaturaAteEm > new Date());
    assert.equal(pagadorAtual.creditosContratacao, 0);
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: beneficiario } })).creditosContratacao, 3);
    assert.equal((await db.apadrinhamento.findUniqueOrThrow({ where: { padrinhoId_afilhadoId: { padrinhoId: pagador, afilhadoId: beneficiario } } })).cotas, 3);

    assert.equal(await transferirCreditosPorto(beneficiario, terceiro, 4), "sem-credito");
    assert.equal(await transferirCreditosPorto(beneficiario, beneficiario, 1), "invalido");
    assert.equal(await transferirCreditosPorto(beneficiario, terceiro, 2), "transferido");
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: beneficiario } })).creditosContratacao, 1);
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: terceiro } })).creditosContratacao, 2);
    assert.equal((await db.apadrinhamento.findUniqueOrThrow({ where: { padrinhoId_afilhadoId: { padrinhoId: beneficiario, afilhadoId: terceiro } } })).cotas, 2);

    const propria = await db.pagamentoPorto.create({
      data: { portoId: pagador, tipo: "CREDITO_CONTRATACAO", quantidade: 2, valorCentavos: 2 * VALOR_COTA_APOIO_CENTAVOS },
    });
    await confirmarPagamentoPorto(propria.id);
    const aposCompra = await db.porto.findUniqueOrThrow({ where: { id: pagador } });
    assert.equal(aposCompra.creditosContratacao, 2);
    assert.equal(aposCompra.assinaturaAteEm?.getTime(), pagadorAtual.assinaturaAteEm?.getTime());

    const concorrente = await db.pagamentoPorto.create({
      data: { portoId: pagador, tipo: "CREDITO_CONTRATACAO", quantidade: 1, valorCentavos: VALOR_COTA_APOIO_CENTAVOS },
    });
    const resultados = await Promise.all([confirmarPagamentoPorto(concorrente.id), confirmarPagamentoPorto(concorrente.id)]);
    assert.equal(resultados.filter((resultado) => resultado.aplicado).length, 1);
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: pagador } })).creditosContratacao, 3);
  });
});
