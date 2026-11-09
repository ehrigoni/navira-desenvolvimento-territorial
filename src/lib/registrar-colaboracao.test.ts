import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { registrarColaboracao } from "./registrar-colaboracao";

test("colaboração registra apoio automaticamente sem duplicar e respeita as permissões", { skip: !process.env.DATABASE_URL && "DATABASE_URL não configurada" }, async () => {
  const sufixo = randomUUID();
  const ids = { dono: `colab-dono-${sufixo}`, outro: `colab-outro-${sufixo}`, usuario: `colab-user-${sufixo}`, iniciativa: `colab-iniciativa-${sufixo}`, meta: `colab-meta-${sufixo}` };
  try {
    await db.porto.createMany({ data: [{ id: ids.dono, nome: "Dono teste" }, { id: ids.outro, nome: "Outro teste" }] });
    const usuario = await db.usuario.create({
      data: { id: ids.usuario, nome: "Teste", telefone: `teste-${sufixo}`, senhaHash: "não utilizada", papel: "NAVEGANTE", navegante: { create: {} } },
      include: { navegante: true },
    });
    const navegante = usuario.navegante!.id;
    await db.iniciativaPorto.create({ data: { id: ids.iniciativa, portoId: ids.dono, titulo: "Teste", descricao: "Teste", categoria: "MUTIRAO", atualizadaEm: new Date() } });
    await db.metaColaboracao.create({ data: { id: ids.meta, iniciativaId: ids.iniciativa, tipo: "Roupas", unidade: "peças", meta: 10 } });
    const valor = new Prisma.Decimal("2.50");
    assert.equal(await registrarColaboracao(ids.meta, valor, { papel: "PORTO", id: ids.dono }), false);
    assert.equal(await registrarColaboracao(ids.meta, valor, { papel: "NAVEGANTE", id: navegante }), false);
    assert.equal(await db.apoioIniciativa.count({ where: { iniciativaId: ids.iniciativa } }), 0);
    await db.inscricaoPorto.create({ data: { portoId: ids.dono, naveganteId: navegante } });
    assert.equal(await registrarColaboracao(ids.meta, valor, { papel: "PORTO", id: ids.outro }), true);
    assert.equal(await registrarColaboracao(ids.meta, valor, { papel: "PORTO", id: ids.outro }), true);
    assert.equal(await registrarColaboracao(ids.meta, valor, { papel: "NAVEGANTE", id: navegante }), true);
    assert.equal(await db.apoioIniciativa.count({ where: { iniciativaId: ids.iniciativa } }), 2);
    assert.equal(await db.contribuicaoIniciativa.count({ where: { metaId: ids.meta, status: "PENDENTE" } }), 3);
    await db.apoioIniciativa.deleteMany({ where: { iniciativaId: ids.iniciativa, portoId: ids.outro } });
    assert.equal(await db.contribuicaoIniciativa.count({ where: { metaId: ids.meta } }), 3);
    await db.iniciativaPorto.update({ where: { id: ids.iniciativa }, data: { status: "ENCERRADO" } });
    assert.equal(await registrarColaboracao(ids.meta, valor, { papel: "PORTO", id: ids.outro }), false);
    assert.equal(await db.contribuicaoIniciativa.count({ where: { metaId: ids.meta } }), 3);
  } finally {
    await db.iniciativaPorto.deleteMany({ where: { id: ids.iniciativa } });
    await db.porto.deleteMany({ where: { id: { in: [ids.dono, ids.outro] } } });
    await db.usuario.deleteMany({ where: { id: ids.usuario } });
  }
});

after(async () => { await db.$disconnect(); });
