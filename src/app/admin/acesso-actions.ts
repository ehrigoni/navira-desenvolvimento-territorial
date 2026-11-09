"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { autenticarAdministrador } from "@/lib/admin-login";
import { criarSessao } from "@/lib/session";
import { MSG, validarIdentificador, validarLogin } from "@/lib/validacao";

export type EstadoAcessoAdmin = { erro?: string; sucesso?: string };

export async function entrarAdmin(_: EstadoAcessoAdmin, form: FormData): Promise<EstadoAcessoAdmin> {
  const credenciais = validarLogin(form);
  if (!credenciais.valido || !credenciais.chave) return { erro: "Informe telefone ou e-mail e senha válidos." };
  let admin;
  try {
    admin = await autenticarAdministrador(credenciais.chave.valor, credenciais.senha);
  } catch (e) {
    console.error("[admin] falha ao autenticar", e);
    return { erro: MSG.loginIndisponivel };
  }
  if (!admin) return { erro: MSG.login };
  await criarSessao({ sub: admin.id, nome: admin.nome, papel: "ADMIN" });
  redirect(admin.trocarSenha ? "/admin/senha" : "/admin");
}

export async function cadastrarAdmin(_: EstadoAcessoAdmin, form: FormData): Promise<EstadoAcessoAdmin> {
  const nome = form.get("nome");
  const login = form.get("identificador");
  const senha = form.get("senha");
  const confirmacao = form.get("confirmacao");
  if (typeof nome !== "string" || nome.trim().length < 2 || nome.trim().length > 120 ||
      typeof login !== "string" || typeof senha !== "string" || senha.length < 8 ||
      Buffer.byteLength(senha, "utf8") > 72 || senha !== confirmacao) {
    return { erro: "Confira nome, senha e confirmação. A senha deve ter de 8 caracteres a 72 bytes." };
  }
  const identificador = validarIdentificador(login);
  if (!identificador.chave) return { erro: identificador.erro };
  try {
    const senhaHash = await bcrypt.hash(senha, 12);
    await db.administrador.create({
      data: { id: randomUUID(), nome: nome.trim(), login: identificador.chave.valor, senhaHash, ativo: false, aprovacaoPendente: true, trocarSenha: false },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { erro: "Já existe um administrador com esse identificador." };
    console.error("[admin] falha ao solicitar cadastro", e);
    return { erro: "Não foi possível concluir o cadastro. Tente novamente." };
  }
  return { sucesso: "Solicitação enviada. Aguarde a aprovação de um administrador para entrar." };
}
