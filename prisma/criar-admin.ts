import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { validarIdentificador } from "../src/lib/validacao";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || !process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Informe DATABASE_URL no ambiente e execute o comando em um terminal interativo.");
  }
  const banco = new URL(url);
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  console.log(`Destino: ${banco.hostname}:${banco.port || "5432"}${banco.pathname}`);
  const confirmacao = await terminal.question("Criar administrador neste banco? Digite SIM: ");
  if (confirmacao !== "SIM") {
    terminal.close();
    throw new Error("Operação cancelada.");
  }
  const nome = (await terminal.question("Nome: ")).trim();
  const login = validarIdentificador(await terminal.question("Telefone ou e-mail: "));
  terminal.close();

  const oculto = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const senhaTerminal = createInterface({ input: process.stdin, output: oculto, terminal: true });
  process.stdout.write("Senha (não será exibida): ");
  const senha = await senhaTerminal.question("");
  process.stdout.write("\nConfirme a senha: ");
  const confirmacaoSenha = await senhaTerminal.question("");
  senhaTerminal.close();
  process.stdout.write("\n");
  if (nome.length < 2 || nome.length > 120 || !login.chave || senha.length < 8 || Buffer.byteLength(senha, "utf8") > 72 || senha !== confirmacaoSenha) {
    throw new Error("Nome, identificador ou senha inválidos; nenhuma conta foi criada.");
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const senhaHash = await bcrypt.hash(senha, 12);
    try {
      await db.administrador.create({
        data: { id: randomUUID(), nome, login: login.chave.valor, senhaHash, trocarSenha: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new Error("Já existe um administrador com esse identificador.");
      }
      throw new Error("Falha ao criar a conta no banco. Confira a conexão e o esquema.");
    }
    console.log("Administrador criado. Será necessário alterar a senha no primeiro acesso.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error("Não foi possível criar o administrador:", e instanceof Error ? e.message : "erro desconhecido");
  process.exitCode = 1;
});
