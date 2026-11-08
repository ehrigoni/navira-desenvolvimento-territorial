// Teste de integração: exige DATABASE_URL apontando para um banco com o schema de produção.
// Sem DATABASE_URL, a suíte é pulada.
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "./db";
import { cifrarDadoSensivel, decifrarDadoSensivel } from "./ethos-crypto";

const temBanco = Boolean(process.env.DATABASE_URL);
const marca = randomUUID().slice(0, 8);
const usuariosCriados: string[] = [];

async function criarNavegante(sufixo: string) {
  const usuario = await db.usuario.create({
    data: {
      nome: `Teste ${sufixo} ${marca}`,
      telefone: `99${marca}${sufixo}`.slice(0, 15),
      senhaHash: "x",
      papel: "NAVEGANTE",
      navegante: { create: {} },
    },
    include: { navegante: true },
  });
  usuariosCriados.push(usuario.id);
  return { usuarioId: usuario.id, naveganteId: usuario.navegante!.id };
}

describe("persistência do Perfil de Travessia", { skip: !temBanco && "DATABASE_URL não configurada" }, () => {
  before(() => {
    process.env.DATA_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");
  });

  after(async () => {
    if (usuariosCriados.length) await db.usuario.deleteMany({ where: { id: { in: usuariosCriados } } });
    await db.$disconnect();
  });

  it("grava e lê o dado sensível cifrado, decifrável só no contexto do dono", async () => {
    const a = await criarNavegante("a");
    const valor = cifrarDadoSensivel("Parda", { naveganteId: a.naveganteId, campo: "racaCor" });

    await db.dadosSensiveis.create({ data: { naveganteId: a.naveganteId, racaCorCifrado: valor } });
    const lido = await db.dadosSensiveis.findUniqueOrThrow({ where: { naveganteId: a.naveganteId } });

    assert.ok(lido.racaCorCifrado && !lido.racaCorCifrado.includes("Parda"));
    assert.equal(decifrarDadoSensivel(lido.racaCorCifrado, { naveganteId: a.naveganteId, campo: "racaCor" }), "Parda");
  });

  it("não decifra quando o valor é copiado para o registro de outro Navegante", async () => {
    const a = await criarNavegante("b");
    const b = await criarNavegante("c");
    const valor = cifrarDadoSensivel("Indígena", { naveganteId: a.naveganteId, campo: "racaCor" });

    await db.dadosSensiveis.create({ data: { naveganteId: b.naveganteId, racaCorCifrado: valor } });
    const copiado = await db.dadosSensiveis.findUniqueOrThrow({ where: { naveganteId: b.naveganteId } });

    assert.throws(() => decifrarDadoSensivel(copiado.racaCorCifrado, { naveganteId: b.naveganteId, campo: "racaCor" }));
  });

  it("mantém histórico de consentimentos (append-only) e ordena pelo mais recente", async () => {
    const a = await criarNavegante("d");
    const base = { usuarioId: a.usuarioId, tipo: "CONTATO" as const, versaoTermo: "teste" };
    await db.consentimento.create({ data: { ...base, concedido: true } });
    await db.consentimento.create({ data: { ...base, concedido: false } });

    const historico = await db.consentimento.findMany({ where: { usuarioId: a.usuarioId, tipo: "CONTATO" } });
    assert.equal(historico.length, 2);
    assert.deepEqual(historico.map((c) => c.concedido).sort(), [false, true]);
  });

  it("uma única resposta por pergunta e Navegante (RespostaEthos)", async () => {
    const a = await criarNavegante("e");
    const dados = {
      id: randomUUID(),
      naveganteId: a.naveganteId,
      bloco: 2,
      questaoId: "Q2.1",
      valor: "7",
      versaoQuestionario: "teste",
      atualizadoEm: new Date(),
    };
    await db.respostaEthos.create({ data: dados });
    await assert.rejects(db.respostaEthos.create({ data: { ...dados, id: randomUUID(), valor: "8" } }), /Unique constraint/);
  });

  it("apaga respostas, dados sensíveis e consentimentos ao remover o usuário (cascade)", async () => {
    const a = await criarNavegante("f");
    await db.respostaEthos.create({
      data: {
        id: randomUUID(),
        naveganteId: a.naveganteId,
        bloco: 0,
        questaoId: "Q0.2",
        valor: "Sim",
        versaoQuestionario: "teste",
        atualizadoEm: new Date(),
      },
    });
    await db.dadosSensiveis.create({ data: { naveganteId: a.naveganteId, religiaoCifrado: "x" } });
    await db.consentimento.create({
      data: { usuarioId: a.usuarioId, tipo: "DADOS_AGREGADOS", concedido: true, versaoTermo: "teste" },
    });

    await db.usuario.delete({ where: { id: a.usuarioId } });
    usuariosCriados.splice(usuariosCriados.indexOf(a.usuarioId), 1);

    assert.equal(await db.navegante.count({ where: { id: a.naveganteId } }), 0);
    assert.equal(await db.respostaEthos.count({ where: { naveganteId: a.naveganteId } }), 0);
    assert.equal(await db.dadosSensiveis.count({ where: { naveganteId: a.naveganteId } }), 0);
    assert.equal(await db.consentimento.count({ where: { usuarioId: a.usuarioId } }), 0);
  });
});
