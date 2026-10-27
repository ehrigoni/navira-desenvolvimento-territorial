// [Índice de Inclusão Produtiva — IIP] — NAVIRA-ImpactScore-IndiceInclusaoProdutiva.docx
// Peso no Navira Impact Score: 30%.
import {
  BaseIndicadores, CATEGORIAS_DIVERSIDADE, CategoriaDiversidade, PessoaIndicador, ROTULO_CATEGORIA,
  Periodo, arredondar, dentro, razao,
} from "./comum";

/** Pesos das três etapas dentro do IIP (documento). */
export const PESOS_IIP = { cadastradas: 0.3, acessadas: 0.35, contratadas: 0.35 } as const;

type Etapa = "cadastradas" | "acessadas" | "contratadas";
export interface Celula { absoluto: number; percentual: number | null }

export interface LinhaDiversidade {
  categoria: CategoriaDiversidade | "TOTAL";
  rotulo: string;
  cadastradas: Celula;
  acessadas: Celula;
  contratadas: Celula;
  /** Coluna "Total pessoas acessadas / Total contratadas": contratadas ÷ acessadas da categoria. */
  conversaoAcessadasContratadas: number | null;
}

export interface IndiceInclusaoProdutiva {
  /** 0–100. */
  indice: number | null;
  /** % de pessoas diversas em cada etapa, que alimenta o índice. */
  componentes: Record<Etapa, number | null>;
  tabela: LinhaDiversidade[];
  equidadeContratacao: {
    /** Pessoas diversas contratadas ÷ total de contratadas. */
    proporcaoDiversosContratados: number | null;
    /** (% diversos entre contratadas) ÷ (% diversos entre cadastradas). 1 = paridade. */
    indiceParidade: number | null;
  };
}

export function calcularInclusaoProdutiva(base: BaseIndicadores, periodo?: Periodo): IndiceInclusaoProdutiva {
  const contratadosIds = new Set(base.contratacoes.filter((c) => dentro(c.inicio, periodo)).map((c) => c.naveganteId));
  const cadastradas = base.pessoas.filter((p) => !periodo || p.cadastradoEm <= periodo.fim);
  const etapas: Record<Etapa, PessoaIndicador[]> = {
    cadastradas,
    // Toda pessoa contratada também foi acessada, mesmo que a candidatura não tenha sido registrada.
    acessadas: cadastradas.filter((p) => p.acessada || contratadosIds.has(p.id)),
    contratadas: cadastradas.filter((p) => contratadosIds.has(p.id)),
  };

  const celula = (lista: PessoaIndicador[], filtro: (p: PessoaIndicador) => boolean): Celula => {
    const absoluto = lista.filter(filtro).length;
    const r = razao(absoluto, lista.length);
    return { absoluto, percentual: arredondar(r === null ? null : r * 100) };
  };
  const linha = (categoria: LinhaDiversidade["categoria"], filtro: (p: PessoaIndicador) => boolean): LinhaDiversidade => {
    const c = {
      cadastradas: celula(etapas.cadastradas, filtro),
      acessadas: celula(etapas.acessadas, filtro),
      contratadas: celula(etapas.contratadas, filtro),
    };
    return {
      categoria,
      rotulo: categoria === "TOTAL" ? "Total pessoas" : ROTULO_CATEGORIA[categoria],
      ...c,
      conversaoAcessadasContratadas: arredondar(razao(c.contratadas.absoluto, c.acessadas.absoluto), 4),
    };
  };

  const diversa = (p: PessoaIndicador) => p.diversidade.length > 0;
  const tabela = [
    ...CATEGORIAS_DIVERSIDADE.map((cat) => linha(cat, (p) => p.diversidade.includes(cat))),
    linha("TOTAL", () => true),
  ];

  const pctDiversos = (e: Etapa) => razao(etapas[e].filter(diversa).length, etapas[e].length);
  const componentes = {
    cadastradas: pctDiversos("cadastradas"),
    acessadas: pctDiversos("acessadas"),
    contratadas: pctDiversos("contratadas"),
  };
  const conhecidos = (Object.keys(PESOS_IIP) as Etapa[]).filter((e) => componentes[e] !== null);
  const somaPesos = conhecidos.reduce((s, e) => s + PESOS_IIP[e], 0);
  const indice = somaPesos
    ? (conhecidos.reduce((s, e) => s + PESOS_IIP[e] * componentes[e]!, 0) / somaPesos) * 100
    : null;

  return {
    indice: arredondar(indice),
    componentes: {
      cadastradas: arredondar(componentes.cadastradas === null ? null : componentes.cadastradas * 100),
      acessadas: arredondar(componentes.acessadas === null ? null : componentes.acessadas * 100),
      contratadas: arredondar(componentes.contratadas === null ? null : componentes.contratadas * 100),
    },
    tabela,
    equidadeContratacao: {
      proporcaoDiversosContratados: arredondar(componentes.contratadas, 4),
      indiceParidade: arredondar(
        componentes.contratadas !== null && componentes.cadastradas
          ? componentes.contratadas / componentes.cadastradas
          : null,
        4,
      ),
    },
  };
}
