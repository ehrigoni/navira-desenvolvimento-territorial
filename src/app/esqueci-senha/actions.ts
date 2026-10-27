"use server";

import { db } from "@/lib/db";
import { apenasDigitos, celularValido, emailValido, fixoValido } from "@/lib/validacao";
import {
  gerarToken,
  JANELA_RECUPERACAO_MS,
  MAX_RECUPERACOES_POR_JANELA,
  VALIDADE_TOKEN_MS,
} from "@/lib/recuperacao";

export type EstadoRecuperacao = {
  erro?: string;
  erros?: { identificador?: string; metodo?: string };
  sucesso?: string;
};

const MSG_GENERICA_EMAIL = "Se o e-mail estiver registrado, você receberá instruções de recuperação em breve.";
const MSG_GENERICA_TELEFONE = "Se o telefone estiver registrado, você receberá instruções de recuperação em breve.";

export async function recuperarSenha(_: EstadoRecuperacao, formData: FormData): Promise<EstadoRecuperacao> {
  const identificador = String(formData.get("identificador") ?? "").trim();
  const metodo = String(formData.get("metodo") ?? "");

  const erros: NonNullable<EstadoRecuperacao["erros"]> = {};
  const porEmail = identificador.includes("@");
  const digitos = apenasDigitos(identificador);
  if (!identificador) erros.identificador = "E-mail ou telefone é obrigatório.";
  else if (porEmail && !emailValido(identificador.toLowerCase())) erros.identificador = "E-mail inválido.";
  else if (!porEmail && !(celularValido(digitos) || fixoValido(digitos))) erros.identificador = "Telefone inválido.";
  if (metodo !== "email" && metodo !== "whatsapp") erros.metodo = "Escolha um método de recuperação.";
  if (erros.identificador || erros.metodo) return { erros };

  try {
    const usuario = await db.usuario.findUnique({
      where: porEmail ? { email: identificador.toLowerCase() } : { telefone: digitos },
    });

    // Rate limiting: no máximo 3 pedidos por hora por conta. Sem revelar a conta ao usuário.
    if (usuario) {
      const agora = new Date();
      const janelaAtiva = usuario.recuperacaoJanelaInicio && agora.getTime() - usuario.recuperacaoJanelaInicio.getTime() < JANELA_RECUPERACAO_MS;
      const contagem = janelaAtiva ? usuario.recuperacoesNaJanela : 0;

      if (contagem < MAX_RECUPERACOES_POR_JANELA) {
        const { token, hash } = gerarToken();
        await db.usuario.update({
          where: { id: usuario.id },
          data: {
            tokenRecuperacao: hash,
            expiracaoTokenRecuperacao: new Date(agora.getTime() + VALIDADE_TOKEN_MS),
            recuperacaoJanelaInicio: janelaAtiva ? usuario.recuperacaoJanelaInicio : agora,
            recuperacoesNaJanela: contagem + 1,
          },
        });
        // TODO: enviar por e-mail (Resend/SendGrid) ou WhatsApp (Twilio). Enquanto isso, o link vai para o log do servidor.
        console.info(`[recuperacao:${metodo}] ${appUrl()}/resetar-senha?token=${token}`);
      }
    }
  } catch (e) {
    console.error("[recuperacao] falha", e);
    return { erro: "Erro ao processar recuperação de senha. Tente novamente." };
  }

  return { sucesso: porEmail ? MSG_GENERICA_EMAIL : MSG_GENERICA_TELEFONE };
}

function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

