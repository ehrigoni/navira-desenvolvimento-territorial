import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { autenticarAdministrador, registrarFalhaLoginAdmin } from "./admin-login";

test("bloqueia após cinco falhas durante 15 minutos, independentemente do fuso do banco", async () => {
  const id = randomUUID();
  await db.administrador.create({ data: { id, login: `teste-${id}`, nome: "Teste", senhaHash: "não utilizada" } });
  try {
    for (let i = 0; i < 5; i++) await registrarFalhaLoginAdmin(id);
    const admin = await db.administrador.findUniqueOrThrow({ where: { id } });
    assert.equal(admin.tentativasFalhas, 5);
    assert.ok(admin.bloqueadoAte);
    const restante = admin.bloqueadoAte.getTime() - Date.now();
    assert.ok(restante > 14 * 60_000 && restante <= 15 * 60_000, `bloqueio restante: ${restante} ms`);
    await registrarFalhaLoginAdmin(id);
    const depois = await db.administrador.findUniqueOrThrow({ where: { id } });
    assert.equal(depois.tentativasFalhas, 5);
  } finally {
    await db.administrador.delete({ where: { id } });
    await db.$disconnect();
  }
});

test("solicitação pendente não pode entrar até ser aprovada", async () => {
  const id = randomUUID();
  const login = `teste-${id}`;
  const senha = "Senha-ficticia-de-teste";
  await db.administrador.create({ data: {
    id, login, nome: "Teste", senhaHash: await bcrypt.hash(senha, 10),
    ativo: false, aprovacaoPendente: true, trocarSenha: false,
  } });
  try {
    assert.equal(await autenticarAdministrador(login, senha), null);
    await db.administrador.update({ where: { id }, data: { ativo: true } });
    assert.equal(await autenticarAdministrador(login, senha), null);
    await db.administrador.update({ where: { id }, data: { aprovacaoPendente: false } });
    assert.equal((await autenticarAdministrador(login, senha))?.id, id);
    await db.administrador.update({ where: { id }, data: { ativo: false } });
    assert.equal(await autenticarAdministrador(login, senha), null);
  } finally {
    await db.administrador.delete({ where: { id } });
    await db.$disconnect();
  }
});
