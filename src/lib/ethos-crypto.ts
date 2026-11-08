import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const SALT_DERIVACAO = "navira:ethos:dados-sensiveis:v1";

// Contexto que amarra o texto cifrado a um registro específico (Navegante + campo).
// Sem isso, um valor cifrado copiado para outro registro decifraria normalmente.
export type ContextoDadoSensivel = {
  naveganteId: string;
  campo: "racaCor" | "religiao";
};

function obterChave() {
  const valor = process.env.DATA_ENCRYPTION_KEY;
  if (!valor) throw new Error("DATA_ENCRYPTION_KEY não está configurada.");

  if (/^[A-Za-z0-9+/]+={0,2}$/.test(valor)) {
    const chave = Buffer.from(valor, "base64");
    if (chave.length === 32 && chave.toString("base64") === valor) return chave;
  }

  if (valor.length < 16) {
    throw new Error("DATA_ENCRYPTION_KEY deve ser uma chave base64 de 32 bytes ou uma frase secreta com pelo menos 16 caracteres.");
  }

  return scryptSync(valor, SALT_DERIVACAO, 32);
}

function aad({ naveganteId, campo }: ContextoDadoSensivel) {
  if (!naveganteId) throw new Error("Contexto de dado sensível sem naveganteId.");
  return Buffer.from(`navira:dados-sensiveis:v1:${naveganteId}:${campo}`, "utf8");
}

export function cifrarDadoSensivel(valor: string, contexto: ContextoDadoSensivel) {
  const iv = randomBytes(12);
  const cifra = createCipheriv(ALGORITMO, obterChave(), iv);
  cifra.setAAD(aad(contexto));
  const dado = Buffer.concat([cifra.update(valor, "utf8"), cifra.final()]);
  return [iv.toString("base64"), cifra.getAuthTag().toString("base64"), dado.toString("base64")].join(".");
}

export function decifrarDadoSensivel(valor: string | null, contexto: ContextoDadoSensivel) {
  if (!valor) return "";
  const [ivCodificado, tagCodificada, dadoCodificado, extra] = valor.split(".");
  if (!ivCodificado || !tagCodificada || !dadoCodificado || extra) {
    throw new Error("Formato de dado sensível criptografado inválido.");
  }

  const decifra = createDecipheriv(ALGORITMO, obterChave(), Buffer.from(ivCodificado, "base64"));
  decifra.setAAD(aad(contexto));
  decifra.setAuthTag(Buffer.from(tagCodificada, "base64"));
  return Buffer.concat([decifra.update(Buffer.from(dadoCodificado, "base64")), decifra.final()]).toString("utf8");
}
