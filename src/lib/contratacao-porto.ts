import { db } from "./db";
import { VALOR_CREDITO_CONTRATACAO_CENTAVOS } from "./porto-regras";
import type { Prisma } from "@prisma/client";

export function expiracaoTurnover(encerradaEm: Date) {
  const limite = new Date(encerradaEm);
  const dia = limite.getUTCDate();
  limite.setUTCDate(1);
  limite.setUTCMonth(limite.getUTCMonth() + 3);
  const ultimoDia = new Date(Date.UTC(limite.getUTCFullYear(), limite.getUTCMonth() + 1, 0)).getUTCDate();
  limite.setUTCDate(Math.min(dia, ultimoDia));
  return limite;
}

export function diasTurnover(inicio: Date, fim: Date) {
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / 86_400_000));
}

export function visivelAoPorto(portoId: string): Prisma.NaveganteWhereInput {
  return { Contratacao: { none: { encerradaEm: null, portoId: { not: portoId } } } };
}

export async function selecionarCandidato(portoId: string, vagaId: string, naveganteId: string) {
  if (!vagaId || !naveganteId) return "sem-candidato" as const;
  return db.$transaction(async (tx) => {
    // Mesma ordem em escolha e encerramento: porto, navegante e vaga.
    await tx.$queryRaw`SELECT id FROM "Porto" WHERE id = ${portoId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Navegante" WHERE id = ${naveganteId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Vaga" WHERE id = ${vagaId} FOR UPDATE`;
    const vaga = await tx.vaga.findFirst({ where: { id: vagaId, portoId, ativa: true }, select: { quantidade: true } });
    if (!vaga) return "vaga-indisponivel" as const;
    const candidatura = await tx.vagaNavegante.findUnique({
      where: { naveganteId_vagaId: { naveganteId, vagaId } },
      select: { navegante: { select: { usuario: { select: { ativo: true } } } } },
    });
    if (!candidatura?.navegante.usuario.ativo) return "sem-candidato" as const;
    const ultimo = await tx.contratacao.findFirst({ where: { naveganteId }, orderBy: [{ criadaEm: "desc" }, { id: "desc" }] });
    if (await tx.contratacao.count({ where: { naveganteId, encerradaEm: null } })) return "candidato-indisponivel" as const;
    const ocupadas = await tx.contratacao.count({ where: { vagaId, encerradaEm: null } });
    if (ocupadas >= vaga.quantidade) return "vaga-indisponivel" as const;
    const debito = await tx.porto.updateMany({
      where: { id: portoId, creditosContratacao: { gt: 0 } },
      data: { creditosContratacao: { decrement: 1 } },
    });
    if (!debito.count) return "sem-credito" as const;
    await tx.contratacao.create({
      data: {
        portoId, vagaId, naveganteId, valorCentavos: VALOR_CREDITO_CONTRATACAO_CENTAVOS,
        criadaEm: new Date(Math.max(Date.now(), (ultimo?.criadaEm.getTime() ?? 0) + 1)),
      },
    });
    if (ocupadas + 1 >= vaga.quantidade) await tx.vaga.update({ where: { id: vagaId }, data: { ativa: false } });
    return "contratado" as const;
  });
}

export async function encerrarContratacao(portoId: string, contratacaoId: string, motivo: string) {
  if (!contratacaoId || motivo.length > 1000) return "encerramento-invalido" as const;
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Porto" WHERE id = ${portoId} FOR UPDATE`;
    const contrato = await tx.contratacao.findFirst({ where: { id: contratacaoId, portoId, encerradaEm: null } });
    if (!contrato) return "encerramento-invalido" as const;
    await tx.$queryRaw`SELECT id FROM "Navegante" WHERE id = ${contrato.naveganteId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Vaga" WHERE id = ${contrato.vagaId} FOR UPDATE`;
    const atualizado = await tx.contratacao.updateMany({
      where: { id: contrato.id, portoId, encerradaEm: null },
      data: { encerradaEm: new Date(), motivoEncerramento: motivo.trim() || null },
    });
    if (!atualizado.count) return "encerramento-invalido" as const;
    // As candidaturas são preservadas; retirar o vínculo as torna visíveis novamente.
    return "vinculo-encerrado" as const;
  });
}

export async function listarCandidatosPorto(portoId: string, agora = new Date()) {
  return db.$transaction(async (tx) => {
  const candidatos = await tx.navegante.findMany({
    where: {
      AND: [
        visivelAoPorto(portoId),
        { usuario: { ativo: true } },
        { OR: [{ vagas: { some: { vaga: { portoId } } } }, { Contratacao: { some: { portoId } } }] },
      ],
    },
    select: {
      id: true, nomeSocial: true, usuario: { select: { nome: true } },
      CursoRealizado: { select: { curso: true, instituicao: true, cargaHoraria: true }, orderBy: { dataRealizacao: "desc" } },
      vagas: { where: { vaga: { portoId } }, select: { vaga: { select: { id: true, titulo: true, ativa: true } } } },
      Contratacao: { orderBy: [{ criadaEm: "desc" }, { id: "desc" }], select: { id: true, portoId: true, criadaEm: true, encerradaEm: true, Vaga: { select: { titulo: true } } } },
    },
    orderBy: { usuario: { nome: "asc" } },
  });
  const autorizados = candidatos.filter((c) => c.Contratacao[0]?.portoId === portoId);
  // Contatos só são consultados para o porto que realizou a escolha mais recente.
  const contatos = autorizados.length ? await tx.usuario.findMany({
    where: { navegante: { id: { in: autorizados.map((c) => c.id) }, Contratacao: { none: { encerradaEm: null, portoId: { not: portoId } } } } },
    select: { nome: true, telefone: true, email: true, navegante: { select: { id: true } } },
  }) : [];
  const contatosPorId = new Map(contatos.map((c) => [c.navegante!.id, { nome: c.nome, telefone: c.telefone, email: c.email }]));
  return candidatos.map((c) => {
    const ultimo = c.Contratacao[0];
    return {
      id: c.id,
      nome: (c.nomeSocial ?? c.usuario.nome).trim().split(/\s+/)[0],
      cursos: c.CursoRealizado,
      vagas: c.vagas.map((v) => v.vaga),
      contatos: ultimo?.portoId === portoId ? contatosPorId.get(c.id) ?? null : null,
      vinculo: ultimo?.portoId === portoId && !ultimo.encerradaEm ? { id: ultimo.id, vaga: ultimo.Vaga.titulo } : null,
      turnovers: c.Contratacao.filter((h) => h.encerradaEm && expiracaoTurnover(h.encerradaEm) > agora).map((h) => ({
        dias: diasTurnover(h.criadaEm, h.encerradaEm!), encerradaEm: h.encerradaEm!,
      })),
    };
  });
  }, { isolationLevel: "RepeatableRead" });
}

export async function atualizarCandidatura(naveganteId: string, vagaId: string, operacao: "adicionar" | "remover" | "alternar") {
  if (!vagaId) return "vaga-invalida" as const;
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Navegante" WHERE id = ${naveganteId} FOR UPDATE`;
    if (await tx.contratacao.count({ where: { naveganteId, encerradaEm: null } })) return "vinculo-ativo" as const;
    const chave = { naveganteId_vagaId: { naveganteId, vagaId } };
    const existente = await tx.vagaNavegante.findUnique({ where: chave });
    if (operacao === "remover" || (operacao === "alternar" && existente)) {
      await tx.vagaNavegante.deleteMany({ where: { naveganteId, vagaId } });
    } else {
      if (!await tx.vaga.findFirst({ where: { id: vagaId, ativa: true }, select: { id: true } })) return "vaga-invalida" as const;
      await tx.vagaNavegante.upsert({ where: chave, create: { naveganteId, vagaId }, update: {} });
    }

    return "atualizada" as const;
  });
}

export async function retirarCandidaturasDoPorto(naveganteId: string, portoId: string) {
  if (!portoId) return "porto-invalido" as const;
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Navegante" WHERE id = ${naveganteId} FOR UPDATE`;
    if (await tx.contratacao.count({ where: { naveganteId, encerradaEm: null } })) return "vinculo-ativo" as const;
    await tx.vagaNavegante.deleteMany({ where: { naveganteId, vaga: { portoId } } });
    return "atualizada" as const;
  });
}
