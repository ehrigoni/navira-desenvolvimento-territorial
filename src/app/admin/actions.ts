"use server";

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirAdministradorParaTrocarSenha, exigirSessao } from "@/lib/auth";
import { validarIdentificador } from "@/lib/validacao";

function texto(form: FormData, campo: string) {
  const valor = form.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function senhaValida(senha: string) {
  return senha.length >= 8 && Buffer.byteLength(senha, "utf8") <= 72;
}

async function administrar<T>(adminId: string, acao: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(718034219)::text`;
    const admin = await tx.administrador.findUnique({ where: { id: adminId }, select: { ativo: true, aprovacaoPendente: true, trocarSenha: true } });
    if (!admin?.ativo || admin.aprovacaoPendente || admin.trocarSenha) throw new Error("Acesso administrativo revogado.");
    return acao(tx);
  });
}

function concluir(aviso: string): never {
  revalidatePath("/admin");
  redirect(`/admin?aviso=${encodeURIComponent(aviso)}`);
}

export type EstadoAlteracaoPorto = { sucesso?: string; erro?: string };

async function executarAlteracaoPorto(form: FormData): Promise<EstadoAlteracaoPorto> {
  const sessao = await exigirSessao("ADMIN");
  const id = texto(form, "id");
  const operacao = texto(form, "operacao");
  if (!id || !["aprovar", "habilitar", "desabilitar"].includes(operacao)) return { erro: "Dados inválidos." };
  const resultado = await administrar(sessao.sub, (tx) => tx.porto.updateMany({
    where: { id, ...(operacao === "aprovar" ? { aprovacaoPendente: true } : { aprovacaoPendente: false }) },
    data: operacao === "aprovar"
      ? { aprovacaoPendente: false, status: "ATIVO" }
      : { status: operacao === "habilitar" ? "ATIVO" : "SUSPENSO" },
  }));
  return resultado.count ? { sucesso: "Porto atualizado." } : { erro: "Porto não encontrado ou alteração indisponível." };
}

export async function alterarPorto(form: FormData) {
  const resultado = await executarAlteracaoPorto(form);
  concluir(resultado.sucesso ?? resultado.erro ?? "Não foi possível atualizar o Porto.");
}

export async function alterarPortoNoMapa(_estado: EstadoAlteracaoPorto, form: FormData): Promise<EstadoAlteracaoPorto> {
  const resultado = await executarAlteracaoPorto(form);
  revalidatePath("/admin");
  return resultado;
}

export async function alterarUsuario(form: FormData) {
  const sessao = await exigirSessao("ADMIN");
  const id = texto(form, "id");
  const ativo = texto(form, "ativo");
  if (!id || !["true", "false"].includes(ativo)) concluir("Dados inválidos.");
  const resultado = await administrar(sessao.sub, (tx) => tx.usuario.updateMany({
    where: { id, papel: { in: ["NAVEGANTE", "DESTINO"] } },
    data: { ativo: ativo === "true" },
  }));
  concluir(resultado.count ? "Conta atualizada." : "Conta não encontrada.");
}

export async function criarAdministrador(form: FormData) {
  const sessao = await exigirSessao("ADMIN");
  const nome = texto(form, "nome");
  const identificador = validarIdentificador(texto(form, "login"));
  const senha = form.get("senha");
  if (nome.length < 2 || nome.length > 120 || !identificador.chave || typeof senha !== "string" || !senhaValida(senha)) {
    concluir("Informe nome, telefone ou e-mail válido e senha de ao menos 8 caracteres e até 72 bytes.");
  }
  const senhaHash = await bcrypt.hash(senha, 12);
  try {
    await administrar(sessao.sub, (tx) => tx.administrador.create({
      data: { id: randomUUID(), nome, login: identificador.chave!.valor, senhaHash, criadoPorId: sessao.sub, trocarSenha: true },
    }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") concluir("Já existe um administrador com esse identificador.");
    throw e;
  }
  concluir("Administrador criado. Ele deverá alterar a senha no primeiro acesso.");
}

export async function alterarAdministrador(form: FormData) {
  const sessao = await exigirSessao("ADMIN");
  const id = texto(form, "id");
  const ativo = texto(form, "ativo");
  if (!id || !["true", "false"].includes(ativo)) concluir("Dados inválidos.");
  const resultado = await administrar(sessao.sub, async (tx) => {
    if (ativo === "false") {
      if (id === sessao.sub) return "Não é permitido desabilitar sua própria conta.";
      if (await tx.administrador.count({ where: { ativo: true } }) <= 1) return "É necessário manter ao menos um administrador ativo.";
    }
    const alterado = await tx.administrador.updateMany({ where: { id, aprovacaoPendente: false }, data: { ativo: ativo === "true" } });
    return alterado.count ? "Administrador atualizado." : "Administrador não encontrado.";
  });
  concluir(resultado);
}

export async function aprovarAdministrador(form: FormData) {
  const sessao = await exigirSessao("ADMIN");
  const id = texto(form, "id");
  if (!id) concluir("Dados inválidos.");
  const resultado = await administrar(sessao.sub, (tx) => tx.administrador.updateMany({
    where: { id, ativo: false, aprovacaoPendente: true },
    data: { ativo: true, aprovacaoPendente: false, criadoPorId: sessao.sub },
  }));
  concluir(resultado.count ? "Cadastro de administrador aprovado." : "Solicitação não encontrada ou já analisada.");
}

export async function trocarSenha(form: FormData) {
  const sessao = await exigirAdministradorParaTrocarSenha();
  const atual = form.get("atual");
  const nova = form.get("nova");
  const confirmacao = form.get("confirmacao");
  if (typeof atual !== "string" || typeof nova !== "string" || !senhaValida(nova) || nova !== confirmacao || Buffer.byteLength(atual, "utf8") > 72) {
    redirect("/admin/senha?erro=validacao");
  }
  const admin = await db.administrador.findUnique({ where: { id: sessao.sub }, select: { senhaHash: true, ativo: true } });
  if (!admin?.ativo || !await bcrypt.compare(atual, admin.senhaHash)) redirect("/admin/senha?erro=credenciais");
  const senhaHash = await bcrypt.hash(nova, 12);
  const alterado = await db.administrador.updateMany({
    where: { id: sessao.sub, ativo: true, senhaHash: admin.senhaHash },
    data: { senhaHash, trocarSenha: false },
  });
  if (!alterado.count) redirect("/admin/senha?erro=credenciais");
  redirect("/admin");
}
