import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { atualizarCandidatura, diasTurnover, encerrarContratacao, expiracaoTurnover, listarCandidatosPorto, retirarCandidaturasDoPorto, selecionarCandidato } from "./contratacao-porto";

const portos: string[] = [];
const usuarios: string[] = [];

async function criarPorto() {
  const porto = await db.porto.create({ data: { nome: "Porto teste", creditosContratacao: 5 } });
  portos.push(porto.id);
  return porto;
}

async function criarCandidato() {
  const id = randomUUID();
  const u = await db.usuario.create({
    data: {
      nome: "Ana Sobrenome Restrito", telefone: `teste-${id}`, email: `${id}@teste.invalid`, senhaHash: "x", papel: "NAVEGANTE",
      navegante: { create: { CursoRealizado: { create: { id: randomUUID(), curso: "Cozinha", descricao: "Não divulgar descrição", instituicao: "Escola", cargaHoraria: 40, dataRealizacao: new Date("2025-01-01") } } } },
    },
    include: { navegante: true },
  });
  usuarios.push(u.id);
  return u.navegante!.id;
}

describe("escolha exclusiva e privacidade de candidatos", { skip: !process.env.DATABASE_URL && "DATABASE_URL não configurada" }, () => {
  after(async () => {
    await db.porto.deleteMany({ where: { id: { in: portos } } });
    await db.usuario.deleteMany({ where: { id: { in: usuarios } } });
    await db.$disconnect();
  });

  it("lista membros sem candidatura, mas não permite escolhê-los sem candidatura à vaga", async () => {
    const porto = await criarPorto();
    const n = await criarCandidato();
    const vaga = await db.vaga.create({ data: { portoId: porto.id, titulo: "Vaga para membro", descricao: "Teste", beneficios: [] } });
    await db.inscricaoPorto.create({ data: { portoId: porto.id, naveganteId: n } });
    const membro = (await listarCandidatosPorto(porto.id)).find((c) => c.id === n);
    assert.ok(membro?.membro);
    assert.equal(membro.contatos, null);
    assert.equal(membro.vagas.length, 0);
    assert.equal(await selecionarCandidato(porto.id, vaga.id, n), "sem-candidato");
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: porto.id } })).creditosContratacao, 5);
  });

  it("preserva os demais candidatos, protege contatos e permite retirar candidaturas sem vínculo", async () => {
    const a = await criarPorto();
    const b = await criarPorto();
    const n = await criarCandidato();
    const outro = await criarCandidato();
    const va = await db.vaga.create({ data: { portoId: a.id, titulo: "Vaga A", descricao: "A", beneficios: [] } });
    const vb = await db.vaga.create({ data: { portoId: b.id, titulo: "Vaga B", descricao: "B", beneficios: [] } });
    for (const vaga of [va, vb]) await atualizarCandidatura(n, vaga.id, "adicionar");
    await atualizarCandidatura(outro, va.id, "adicionar");
    const antes = (await listarCandidatosPorto(a.id)).find((c) => c.id === n)!;
    assert.equal(antes.nome, "Ana");
    assert.equal(antes.contatos, null);
    assert.equal(antes.cursos[0].cargaHoraria, 40);
    assert.ok(!JSON.stringify(antes).includes("Sobrenome Restrito"));
    assert.ok(!JSON.stringify(antes).includes("Não divulgar descrição"));

    const concorrentes = await Promise.all([selecionarCandidato(a.id, va.id, n), selecionarCandidato(b.id, vb.id, n)]);
    assert.equal(concorrentes.filter((r) => r === "contratado").length, 1);
    const contrato = await db.contratacao.findFirstOrThrow({ where: { naveganteId: n, encerradaEm: null } });
    const vencedor = contrato.portoId;
    const perdedor = vencedor === a.id ? b.id : a.id;
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: vencedor } })).creditosContratacao, 4);
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: perdedor } })).creditosContratacao, 5);
    assert.equal((await listarCandidatosPorto(perdedor)).find((c) => c.id === n), undefined);
    assert.equal((await listarCandidatosPorto(vencedor)).find((c) => c.id === n)!.contatos!.nome, "Ana Sobrenome Restrito");
    assert.ok((await listarCandidatosPorto(a.id)).some((c) => c.id === outro));
    assert.equal(await atualizarCandidatura(n, vb.id, "remover"), "vinculo-ativo");
    assert.equal(await retirarCandidaturasDoPorto(n, perdedor), "vinculo-ativo");
    assert.equal(await encerrarContratacao(perdedor, contrato.id, "Distância"), "encerramento-invalido");
    assert.equal(await encerrarContratacao(vencedor, contrato.id, "Distância"), "vinculo-encerrado");
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: vencedor } })).creditosContratacao, 4);
    assert.equal((await listarCandidatosPorto(perdedor)).find((c) => c.id === n)!.turnovers.length, 1);
    assert.equal((await listarCandidatosPorto(perdedor)).find((c) => c.id === n)!.contatos, null);
    const velhaData = new Date("2026-01-01T00:00:00Z");
    await db.contratacao.update({ where: { id: contrato.id }, data: { criadaEm: new Date("2025-12-20"), encerradaEm: velhaData } });
    assert.equal((await listarCandidatosPorto(perdedor, new Date("2026-03-31"))).find((c) => c.id === n)!.turnovers[0].dias, 12);
    assert.equal((await listarCandidatosPorto(perdedor, new Date("2026-04-02"))).find((c) => c.id === n)!.turnovers.length, 0);
    await db.vaga.update({ where: { id: vb.id }, data: { ativa: true } });
    await db.vaga.update({ where: { id: va.id }, data: { ativa: true } });
    assert.equal(await selecionarCandidato(perdedor, perdedor === a.id ? va.id : vb.id, n), "contratado");
    assert.equal((await listarCandidatosPorto(vencedor)).find((c) => c.id === n), undefined);
    assert.equal(await atualizarCandidatura(outro, va.id, "remover"), "atualizada");
    assert.ok(!(await listarCandidatosPorto(a.id)).some((c) => c.id === outro));
  });

  it("a retirada simultânea impede débitos para candidaturas removidas", async () => {
    const porto = await criarPorto();
    const n = await criarCandidato();
    const vaga = await db.vaga.create({ data: { portoId: porto.id, titulo: "Concorrente", descricao: "Teste", beneficios: [] } });
    await atualizarCandidatura(n, vaga.id, "adicionar");
    const [retirada, escolha] = await Promise.all([atualizarCandidatura(n, vaga.id, "remover"), selecionarCandidato(porto.id, vaga.id, n)]);
    if (retirada === "atualizada") {
      assert.equal(escolha, "sem-candidato");
      assert.equal((await db.porto.findUniqueOrThrow({ where: { id: porto.id } })).creditosContratacao, 5);
    } else {
      assert.equal(retirada, "vinculo-ativo");
      assert.equal(escolha, "contratado");
    }
  });

  it("não consome duas cotas nem excede a capacidade ao escolher candidatos simultaneamente", async () => {
    const porto = await criarPorto();
    const primeiro = await criarCandidato();
    const segundo = await criarCandidato();
    const vaga = await db.vaga.create({ data: { portoId: porto.id, titulo: "Única", descricao: "Teste", beneficios: [] } });
    await atualizarCandidatura(primeiro, vaga.id, "adicionar");
    await atualizarCandidatura(segundo, vaga.id, "adicionar");
    const resultados = await Promise.all([selecionarCandidato(porto.id, vaga.id, primeiro), selecionarCandidato(porto.id, vaga.id, segundo)]);
    assert.equal(resultados.filter((r) => r === "contratado").length, 1);
    assert.equal((await db.porto.findUniqueOrThrow({ where: { id: porto.id } })).creditosContratacao, 4);
    assert.equal((await listarCandidatosPorto(porto.id)).filter((c) => !c.vinculo).length, 1);
    const disponivel = (await listarCandidatosPorto(porto.id)).find((c) => !c.vinculo)!;
    assert.equal(await atualizarCandidatura(disponivel.id, vaga.id, "remover"), "atualizada");
  });

  it("retira todas as candidaturas de um porto sem retirar as de outros portos", async () => {
    const a = await criarPorto();
    const b = await criarPorto();
    const n = await criarCandidato();
    for (const portoId of [a.id, a.id, b.id]) {
      const vaga = await db.vaga.create({ data: { portoId, titulo: "Aplicação", descricao: "Teste", beneficios: [] } });
      await atualizarCandidatura(n, vaga.id, "adicionar");
    }
    assert.equal(await retirarCandidaturasDoPorto(n, a.id), "atualizada");
    assert.ok(!(await listarCandidatosPorto(a.id)).some((c) => c.id === n));
    assert.ok((await listarCandidatosPorto(b.id)).some((c) => c.id === n));
  });
});

it("calcula o turnover em dias e respeita o limite de três meses", () => {
  assert.equal(diasTurnover(new Date("2026-01-01"), new Date("2026-01-03")), 2);
  assert.equal(expiracaoTurnover(new Date("2026-01-31T12:00:00Z")).toISOString(), "2026-04-30T12:00:00.000Z");
  assert.equal(expiracaoTurnover(new Date("2026-02-28T12:00:00Z")).toISOString(), "2026-05-28T12:00:00.000Z");
});
