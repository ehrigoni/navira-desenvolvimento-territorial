// Token de recuperação de senha (docs/entrada/ESPECIFICACAO_RECUPERACAO_SENHA.md).
import { createHash, randomBytes } from "node:crypto";

export const VALIDADE_TOKEN_MS = 60 * 60 * 1000; // 1 hora
export const MAX_RECUPERACOES_POR_JANELA = 3;
export const JANELA_RECUPERACAO_MS = 60 * 60 * 1000; // 1 hora

export function gerarToken() {
  const token = randomBytes(32).toString("hex"); // 256 bits
  return { token, hash: hashToken(token) };
}

/** Só o hash fica no banco; o token original vai apenas ao usuário. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
