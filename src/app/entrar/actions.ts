"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { criarSessao } from "@/lib/session";
import { destinoPosLogin } from "@/lib/fluxos";
import { MSG, validarLogin } from "@/lib/validacao";

export type EstadoLogin = {
  erro?: string;
  erros?: { identificador?: string; senha?: string };
  campos?: { identificador?: string };
};

// Hash usado quando o usuário não existe, para o tempo de resposta não revelar a conta.
let hashFalso: string | undefined;

export async function entrar(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  // 1) Validação no servidor (o navegador pode ser contornado).
  const v = validarLogin(formData);
  const campos = { identificador: v.identificador };
  if (!v.valido || !v.chave) return { erros: v.erros, campos };

  // 2) Conferência de credenciais. Falhas de banco não derrubam a tela.
  let usuario;
  let confere = false;
  try {
    usuario = await db.usuario.findUnique({
      where: v.chave.tipo === "email" ? { email: v.chave.valor } : { telefone: v.chave.valor },
    });
    hashFalso ??= bcrypt.hashSync("navira-dummy", 12);
    confere = await bcrypt.compare(v.senha, usuario?.senhaHash ?? hashFalso);
  } catch (e) {
    console.error("[login] falha ao consultar usuário", e);
    return { erro: MSG.loginIndisponivel, campos };
  }

  // Mesma mensagem para usuário inexistente e senha errada. Nenhuma sessão é criada.
  if (!usuario || !confere) return { erro: MSG.login, campos };

  // 3) Sessão e último login. Falha ao registrar o login não impede a entrada.
  try {
    await db.usuario.update({ where: { id: usuario.id }, data: { ultimoLoginEm: new Date() } });
  } catch (e) {
    console.error("[login] falha ao registrar último login", e);
  }

  await criarSessao({ sub: usuario.id, nome: usuario.nome, papel: usuario.papel });

  // 4) Encaminha para o fluxo do perfil. O redirect fica fora de try/catch (ele lança uma exceção interna).
  redirect(destinoPosLogin(usuario));
}
