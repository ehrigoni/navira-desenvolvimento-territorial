"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/recuperacao";
import { SENHA_MAX, SENHA_MIN } from "@/lib/validacao";

export type EstadoResetar = { erro?: string; erros?: { senha?: string; confirmacao?: string } };

export async function resetarSenha(_: EstadoResetar, formData: FormData): Promise<EstadoResetar> {
  const token = String(formData.get("token") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  const erros: NonNullable<EstadoResetar["erros"]> = {};
  if (senha.length < SENHA_MIN) erros.senha = "A senha deve ter pelo menos 8 caracteres.";
  else if (senha.length > SENHA_MAX) erros.senha = "A senha deve ter no máximo 72 caracteres.";
  if (senha !== confirmacao) erros.confirmacao = "As senhas não conferem.";
  if (Object.keys(erros).length) return { erros };

  if (!token) return { erro: "Link inválido ou expirado. Solicite uma nova recuperação." };

  try {
    const usuario = await db.usuario.findFirst({
      where: { tokenRecuperacao: hashToken(token), expiracaoTokenRecuperacao: { gt: new Date() } },
      select: { id: true },
    });
    if (!usuario) return { erro: "Link inválido ou expirado. Solicite uma nova recuperação." };

    const senhaHash = await bcrypt.hash(senha, 12);
    // Troca a senha e invalida o token, para que ele não sirva uma segunda vez.
    await db.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash, tokenRecuperacao: null, expiracaoTokenRecuperacao: null },
    });
  } catch (e) {
    console.error("[resetar-senha] falha", e);
    return { erro: "Erro ao redefinir a senha. Tente novamente." };
  }

  redirect("/entrar?mensagem=senha-redefinida");
}
