// Regras de validação de e-mail, celular/telefone e senha.
// Usada no navegador (feedback imediato) e no servidor (fonte da verdade).
// Regras: docs/entrada/regras-tela-login.md e docs/entrada/fix-login-servidor.md.
import { z } from "zod";

export const MSG = {
  identificadorObrigatorio: "Informe seu celular, telefone ou e-mail.",
  email: "E-mail inválido. Use o formato nome@dominio.com (ex.: nome@exemplo.com.br).",
  celular: "Número de celular inválido. Use DDD + número, ex.: (11) 91234-5678.",
  telefone: "Número de telefone inválido. Use DDD + número, ex.: (11) 3123-4567.",
  senhaObrigatoria: "Informe sua senha.",
  senhaLonga: "A senha informada é longa demais.",
  senhaCurta: "A senha deve ter pelo menos 8 caracteres.",
  senhaLongaCadastro: "A senha deve ter no máximo 72 caracteres.",
  nomeObrigatorio: "Informe seu nome.",
  papelObrigatorio: "Escolha quem você é na jornada.",
  identificadorEmUso: "Este e-mail ou telefone já está cadastrado.",
  login: "Usuário ou senha inválidos.",
  loginIndisponivel: "Não foi possível entrar agora. Tente novamente em instantes.",
  erroGenerico: "Algo deu errado. Tente novamente.",
} as const;

export const LIMITE_EMAIL = 254;
export const LIMITE_SENHA_LOGIN = 128; // evita gastar bcrypt com entradas gigantes
export const SENHA_MIN = 8;
export const SENHA_MAX = 72; // limite do bcrypt

export type ChaveIdentificador = { tipo: "email" | "telefone"; valor: string };
export type ErrosIdentificador = { identificador?: string; senha?: string };

export function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

/** `XXX@XXX.XX`: um único @, sem espaços, domínio com ponto e extensão de 2+ letras. */
export function emailValido(valor: string) {
  return valor.length <= LIMITE_EMAIL && /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(valor);
}

/** Celular: DDD + 9 dígitos começando com 9. Fixo: DDD + 8 dígitos começando de 2 a 5. */
export function celularValido(valor: string) {
  return /^\d{2}9\d{8}$/.test(apenasDigitos(valor));
}

export function fixoValido(valor: string) {
  return /^\d{2}[2-5]\d{7}$/.test(apenasDigitos(valor));
}

/**
 * Identifica se o texto é e-mail (contém @) ou telefone e normaliza.
 * E-mail vira minúsculas; telefone fica só com dígitos.
 */
export function validarIdentificador(bruto: string): { chave?: ChaveIdentificador; erro?: string } {
  const identificador = bruto.trim();
  if (!identificador) return { erro: MSG.identificadorObrigatorio };

  if (identificador.includes("@")) {
    const email = identificador.toLowerCase();
    return emailValido(email) ? { chave: { tipo: "email", valor: email } } : { erro: MSG.email };
  }

  // Com letras e sem @, o usuário está tentando digitar um e-mail: aponta a regra do e-mail.
  if (/[a-zA-Z]/.test(identificador)) return { erro: MSG.email };
  if (!/^[\d\s()+-]+$/.test(identificador)) return { erro: MSG.celular };
  const digitos = apenasDigitos(identificador);
  if (celularValido(digitos)) return { chave: { tipo: "telefone", valor: digitos } };
  if (fixoValido(digitos)) return { chave: { tipo: "telefone", valor: digitos } };
  return { erro: digitos.length <= 10 ? MSG.telefone : MSG.celular };
}

/** Validação do login (navegador e servidor). Não há limite de tentativas. */
export function validarCredenciais(identificadorBruto: string, senha: string) {
  const { chave, erro } = validarIdentificador(identificadorBruto);
  const erros: ErrosIdentificador = {};
  if (erro) erros.identificador = erro;

  if (!senha) erros.senha = MSG.senhaObrigatoria;
  else if (senha.length > LIMITE_SENHA_LOGIN) erros.senha = MSG.senhaLonga;

  return {
    identificador: identificadorBruto.trim(),
    senha,
    chave,
    erros,
    valido: !erros.identificador && !erros.senha && !!chave,
  };
}

/** Versão do servidor: lê o FormData sem confiar no navegador (arquivos ou valores inesperados contam como vazio). */
export function validarLogin(fd: FormData) {
  const texto = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  return validarCredenciais(texto("identificador"), texto("senha"));
}

/** Cadastro: nome, e-mail ou celular/telefone, senha de 8 a 72 caracteres e papel. */
export const cadastroSchema = z.object({
  nome: z.string().trim().min(2, MSG.nomeObrigatorio).max(120),
  identificador: z.string(),
  senha: z
    .string()
    .min(SENHA_MIN, MSG.senhaCurta)
    .max(SENHA_MAX, MSG.senhaLongaCadastro),
  papel: z.enum(["NAVEGANTE", "PORTO"], { message: MSG.papelObrigatorio }),
});
