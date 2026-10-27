// Único ponto que conhece o banco: converte o Prisma em `BaseIndicadores`.
// Se algum nome de campo do projeto for diferente, ajuste só aqui (marcado com "AJUSTE").
import type { PrismaClient } from "@prisma/client";
import {
  BaseIndicadores, CategoriaDiversidade, PessoaIndicador, municipioChave,
} from "./comum";

/** Faixas etárias consideradas diversidade na categoria "Idade". AJUSTE conforme o programa. */
export const FAIXA_ETARIA_DIVERSIDADE = { ate: 24, aPartirDe: 50 };

const STATUS_ACESSADA = ["CANDIDATADA", "ENTREVISTADA", "CONTRATADA", "RECUSADA"];

function idade(nascimento: Date | null, referencia: Date): number | null {
  if (!nascimento) return null;
  let anos = referencia.getFullYear() - nascimento.getFullYear();
  const m = referencia.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && referencia.getDate() < nascimento.getDate())) anos--;
  return anos;
}

// AJUSTE: se gênero/raça/PCD/periferia já são respostas do Ethos (bloco Q1),
// leia daqui as respostas em vez dos campos novos do Navegante.
export function diversidadeDoNavegante(
  n: { genero?: string | null; racaCor?: string | null; pcd?: boolean | null; moraEmPeriferia?: boolean | null; dataNascimento?: Date | null },
  referencia = new Date(),
): CategoriaDiversidade[] {
  const cats: CategoriaDiversidade[] = [];
  if (n.genero === "MULHER") cats.push("GENERO");
  if (n.racaCor === "PRETA" || n.racaCor === "PARDA" || n.racaCor === "INDIGENA") cats.push("RACA");
  if (n.pcd) cats.push("PCD");
  if (n.moraEmPeriferia) cats.push("PERIFERIA");
  const anos = idade(n.dataNascimento ?? null, referencia);
  if (anos !== null && (anos <= FAIXA_ETARIA_DIVERSIDADE.ate || anos >= FAIXA_ETARIA_DIVERSIDADE.aPartirDe)) cats.push("IDADE");
  return cats;
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const nomeCurso = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toUpperCase();

export async function carregarBaseIndicadores(prisma: PrismaClient): Promise<BaseIndicadores> {
  const [navegantes, contratacoes, vagas, cursosRealizados, empresas, prioritarios] = await Promise.all([
    prisma.navegante.findMany({
      select: {
        id: true, createdAt: true, ultimaAtividadeEm: true, salarioInicial: true,
        genero: true, racaCor: true, pcd: true, moraEmPeriferia: true, dataNascimento: true,
        inscricoes: { select: { porto: { select: { cidade: true, uf: true } } } }, // AJUSTE: relação Navegante → InscricaoPorto
        vagas: { where: { status: { in: STATUS_ACESSADA as never } }, select: { vagaId: true }, take: 1 }, // VagaNavegante
      },
    }),
    prisma.contratacao.findMany({
      select: {
        naveganteId: true, vagaId: true, destinoId: true, inicio: true, fim: true, salario: true,
        cidade: true, uf: true, destino: { select: { cidade: true, uf: true } },
      },
    }),
    prisma.vaga.findMany({
      select: {
        id: true, destinoId: true, createdAt: true, // AJUSTE: data de publicação da vaga
        destino: { select: { cidade: true, uf: true } },
        _count: { select: { contratacoes: true } },
      },
    }),
    // AJUSTE: model dos cursos realizados pelo Navegante ([Especificacao-Curso]).
    prisma.cursoRealizado.findMany({
      select: { naveganteId: true, curso: true, dataRealizacao: true, navegante: { select: { inscricoes: { select: { porto: { select: { cidade: true, uf: true } } }, take: 1 } } } },
    }),
    prisma.destino.findMany({
      select: { id: true, cidade: true, uf: true, createdAt: true, _count: { select: { empresaPortos: true } } }, // AJUSTE: relação Destino → EmpresaPorto
    }),
    prisma.municipioPrioritario.findMany(),
  ]);

  const pessoas: PessoaIndicador[] = navegantes.map((n: any) => ({
    id: n.id,
    cadastradoEm: n.createdAt,
    ultimaAtividadeEm: n.ultimaAtividadeEm,
    diversidade: diversidadeDoNavegante(n),
    municipios: [...new Set(n.inscricoes.map((i: any) => municipioChave(i.porto.cidade, i.porto.uf)).filter(Boolean))] as string[],
    salarioInicial: num(n.salarioInicial),
    acessada: n.vagas.length > 0,
  }));

  return {
    pessoas,
    contratacoes: contratacoes.map((c: any) => ({
      naveganteId: c.naveganteId,
      vagaId: c.vagaId ?? "",
      destinoId: c.destinoId,
      municipio: municipioChave(c.cidade ?? c.destino.cidade, c.uf ?? c.destino.uf) ?? "NÃO INFORMADO",
      inicio: c.inicio,
      fim: c.fim,
      salario: num(c.salario),
    })),
    vagas: vagas.map((v: any) => ({
      id: v.id,
      destinoId: v.destinoId,
      municipio: municipioChave(v.destino.cidade, v.destino.uf) ?? "NÃO INFORMADO",
      publicadaEm: v.createdAt,
      preenchida: v._count.contratacoes > 0,
    })),
    cursosConcluidos: cursosRealizados.map((c: any) => {
      const porto = c.navegante.inscricoes[0]?.porto;
      return {
        naveganteId: c.naveganteId,
        curso: nomeCurso(c.curso),
        concluidoEm: c.dataRealizacao,
        municipio: porto ? municipioChave(porto.cidade, porto.uf) : null,
      };
    }),
    empresas: empresas.map((e: any) => ({
      id: e.id,
      municipio: municipioChave(e.cidade, e.uf),
      cadastradaEm: e.createdAt,
      portosApadrinhados: e._count.empresaPortos,
    })),
    municipiosPrioritarios: prioritarios.map((m: any) => ({
      municipio: municipioChave(m.nome, m.uf)!,
      nome: m.nome,
      uf: m.uf,
      populacaoEconomicamenteAtiva: m.populacaoEconomicamenteAtiva,
    })),
  };
}
