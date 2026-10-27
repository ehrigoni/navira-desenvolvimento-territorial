// Sessão em cookie assinado (HMAC-SHA256). Não guarda nada além de id, nome e papel.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_SESSAO = "navira_sessao";
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000;

export type Papel = "NAVEGANTE" | "PORTO";
export type Sessao = { sub: string; nome: string; papel: Papel; exp: number };

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET ausente ou curto demais (mínimo 16 caracteres).");
  return s;
}

function assinar(corpo: string) {
  return createHmac("sha256", segredo()).update(corpo).digest("base64url");
}

export async function criarSessao(dados: { sub: string; nome: string; papel: Papel }) {
  const corpo: Sessao = { ...dados, exp: Date.now() + DURACAO_MS };
  const payload = Buffer.from(JSON.stringify(corpo)).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, `${payload}.${assinar(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_MS / 1000,
  });
}

export async function lerSessao(): Promise<Sessao | null> {
  const valor = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!valor) return null;

  const [payload, assinatura] = valor.split(".");
  if (!payload || !assinatura) return null;

  const esperada = Buffer.from(assinar(payload));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;

  try {
    const sessao = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Sessao;
    return sessao.exp > Date.now() ? sessao : null;
  } catch {
    return null;
  }
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}
