"use server";

import bcrypt from "bcryptjs";
import { Prisma, type TipoPorto } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { criarSessao } from "@/lib/session";
import { destinoPosLogin } from "@/lib/fluxos";
import { apenasDigitos, cadastroSchema, MSG, validarIdentificador } from "@/lib/validacao";

export type EstadoCadastro = {
  erro?: string;
  erros?: Partial<Record<"nome" | "identificador" | "senha" | "papel" | "nomePorto" | "cep" | "cidade" | "uf", string>>;
  campos?: Record<string, string>;
};

const TIPOS: TipoPorto[] = ["IGREJA", "ESCOLA", "ASSOCIACAO", "INICIATIVA", "OUTRO"];

export async function cadastrar(_: EstadoCadastro, formData: FormData): Promise<EstadoCadastro> {
  const texto = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const campos = {
    nome: texto("nome"),
    identificador: texto("identificador"),
    papel: texto("papel"),
    nomePorto: texto("nomePorto"),
    tipo: texto("tipo"),
    cep: texto("cep"),
    cidade: texto("cidade"),
    uf: texto("uf").toUpperCase(),
  };

  const erros: NonNullable<EstadoCadastro["erros"]> = {};

  const base = cadastroSchema.safeParse({
    nome: campos.nome,
    identificador: campos.identificador,
    senha: texto("senha"),
    papel: campos.papel,
  });
  if (!base.success) {
    for (const issue of base.error.issues) {
      const campo = issue.path[0] as keyof NonNullable<EstadoCadastro["erros"]>;
      erros[campo] ??= issue.message;
    }
  }

  const ident = validarIdentificador(campos.identificador);
  if (ident.erro) erros.identificador = ident.erro;

  const cep = apenasDigitos(campos.cep);
  if (campos.papel === "PORTO") {
    if (!campos.nomePorto) erros.nomePorto = "Informe o nome do porto.";
    if (!/^\d{8}$/.test(cep)) erros.cep = "CEP inválido. Use 8 dígitos.";
    if (!campos.cidade) erros.cidade = "Informe a cidade.";
    if (!/^[A-Z]{2}$/.test(campos.uf)) erros.uf = "Informe a UF com 2 letras.";
    if (!TIPOS.includes(campos.tipo as TipoPorto)) campos.tipo = "OUTRO";
  } else if (cep && !/^\d{8}$/.test(cep)) {
    erros.cep = "CEP inválido. Use 8 dígitos.";
  }

  if (Object.keys(erros).length) return { erros, campos };

  const senhaHash = await bcrypt.hash(texto("senha"), 12);
  const chave = ident.chave!;

  try {
    const existente = await db.usuario.findUnique({
      where: chave.tipo === "email" ? { email: chave.valor } : { telefone: chave.valor },
      select: { id: true },
    });
    if (existente) return { erro: MSG.identificadorEmUso, campos };

    const usuario = await db.usuario.create({
      data: {
        nome: campos.nome,
        senhaHash,
        papel: base.data!.papel,
        ...(chave.tipo === "email" ? { email: chave.valor } : { telefone: chave.valor }),
        ...(base.data!.papel === "PORTO"
          ? {
              porto: {
                create: {
                  nome: campos.nomePorto,
                  tipo: TIPOS.includes(campos.tipo as TipoPorto) ? (campos.tipo as TipoPorto) : "OUTRO",
                  cep,
                  cidade: campos.cidade,
                  uf: campos.uf,
                },
              },
            }
          : {
              navegante: { create: { cep: cep || null } },
            }),
      },
    });

    await criarSessao({ sub: usuario.id, nome: usuario.nome, papel: usuario.papel });
    redirect(destinoPosLogin(usuario));
  } catch (e) {
    // Corrida entre a checagem e o insert: a constraint única também protege o cadastro.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erro: MSG.identificadorEmUso, campos };
    }
    if (isRedirectError(e)) throw e;
    console.error("[cadastro] falha", e);
    return { erro: MSG.erroGenerico, campos };
  }
}

function isRedirectError(e: unknown) {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
