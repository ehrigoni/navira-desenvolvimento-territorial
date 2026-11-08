import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cifrarDadoSensivel, decifrarDadoSensivel } from "./ethos-crypto";

const CHAVE_ORIGINAL = process.env.DATA_ENCRYPTION_KEY;
const CONTEXTO = { naveganteId: "nav_1", campo: "racaCor" } as const;

beforeEach(() => {
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

afterEach(() => {
  if (CHAVE_ORIGINAL === undefined) delete process.env.DATA_ENCRYPTION_KEY;
  else process.env.DATA_ENCRYPTION_KEY = CHAVE_ORIGINAL;
});

describe("cifrarDadoSensivel / decifrarDadoSensivel", () => {
  it("decifra o próprio valor (ida e volta, com acentos)", () => {
    const cifrado = cifrarDadoSensivel("Indígena", CONTEXTO);
    assert.equal(decifrarDadoSensivel(cifrado, CONTEXTO), "Indígena");
  });

  it("não grava o texto em claro no valor cifrado", () => {
    const cifrado = cifrarDadoSensivel("Umbanda", { naveganteId: "nav_1", campo: "religiao" });
    assert.ok(!cifrado.includes("Umbanda"));
    assert.equal(cifrado.split(".").length, 3);
  });

  it("usa IV aleatório: duas cifras do mesmo valor são diferentes", () => {
    assert.notEqual(cifrarDadoSensivel("Parda", CONTEXTO), cifrarDadoSensivel("Parda", CONTEXTO));
  });

  it("rejeita valor cifrado copiado para outro Navegante (AAD)", () => {
    const cifrado = cifrarDadoSensivel("Preta", CONTEXTO);
    assert.throws(() => decifrarDadoSensivel(cifrado, { naveganteId: "nav_2", campo: "racaCor" }));
  });

  it("rejeita valor cifrado usado em outro campo do mesmo Navegante (AAD)", () => {
    const cifrado = cifrarDadoSensivel("Preta", CONTEXTO);
    assert.throws(() => decifrarDadoSensivel(cifrado, { naveganteId: "nav_1", campo: "religiao" }));
  });

  it("detecta adulteração do texto cifrado (GCM)", () => {
    const [iv, tag, dado] = cifrarDadoSensivel("Branca", CONTEXTO).split(".");
    const bytes = Buffer.from(dado, "base64");
    bytes[0] ^= 0xff;
    assert.throws(() => decifrarDadoSensivel([iv, tag, bytes.toString("base64")].join("."), CONTEXTO));
  });

  it("detecta adulteração da tag de autenticação", () => {
    const [iv, , dado] = cifrarDadoSensivel("Branca", CONTEXTO).split(".");
    const tagFalsa = randomBytes(16).toString("base64");
    assert.throws(() => decifrarDadoSensivel([iv, tagFalsa, dado].join("."), CONTEXTO));
  });

  it("falha com a chave errada", () => {
    const cifrado = cifrarDadoSensivel("Amarela", CONTEXTO);
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    assert.throws(() => decifrarDadoSensivel(cifrado, CONTEXTO));
  });

  it("aceita frase secreta com 16 caracteres ou mais", () => {
    process.env.DATA_ENCRYPTION_KEY = "frase-secreta-longa-de-teste";
    const cifrado = cifrarDadoSensivel("Amarela", CONTEXTO);
    assert.equal(decifrarDadoSensivel(cifrado, CONTEXTO), "Amarela");
  });

  it("recusa frase secreta curta", () => {
    process.env.DATA_ENCRYPTION_KEY = "curta";
    assert.throws(() => cifrarDadoSensivel("Amarela", CONTEXTO), /pelo menos 16 caracteres/);
  });

  it("recusa cifrar sem DATA_ENCRYPTION_KEY configurada", () => {
    delete process.env.DATA_ENCRYPTION_KEY;
    assert.throws(() => cifrarDadoSensivel("Amarela", CONTEXTO), /não está configurada/);
  });

  it("recusa contexto sem naveganteId", () => {
    assert.throws(() => cifrarDadoSensivel("Amarela", { naveganteId: "", campo: "racaCor" }), /naveganteId/);
  });

  it("rejeita formato inválido", () => {
    assert.throws(() => decifrarDadoSensivel("so-um-pedaco", CONTEXTO), /Formato/);
    assert.throws(() => decifrarDadoSensivel("a.b.c.d", CONTEXTO), /Formato/);
  });

  it("retorna string vazia para valor ausente", () => {
    assert.equal(decifrarDadoSensivel(null, CONTEXTO), "");
  });
});
