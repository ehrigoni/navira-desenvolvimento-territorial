// Tipos e utilitários comuns aos indicadores do NAVIRA
// (Navira em Números, Índice de Inclusão Produtiva e Índice de Desenvolvimento Territorial).
//
// Os cálculos trabalham sobre estes tipos "planos", e não diretamente sobre o Prisma:
// `carregar.ts` é o único arquivo que conhece o banco. Assim as regras ficam testáveis
// e uma mudança no schema só exige ajuste no carregador.

export type Periodo = { inicio: Date; fim: Date };

/** Categorias de diversidade da tabela do IIP. */
export const CATEGORIAS_DIVERSIDADE = ["GENERO", "RACA", "PCD", "PERIFERIA", "IDADE"] as const;
export type CategoriaDiversidade = (typeof CATEGORIAS_DIVERSIDADE)[number];

export const ROTULO_CATEGORIA: Record<CategoriaDiversidade, string> = {
  GENERO: "Gênero (mulheres)",
  RACA: "Raça (negros, indígenas)",
  PCD: "PCD",
  PERIFERIA: "Especial (periferia)",
  IDADE: "Idade",
};

export interface PessoaIndicador {
  id: string;
  cadastradoEm: Date;
  /** Último login ou última atividade registrada. */
  ultimaAtividadeEm: Date | null;
  diversidade: CategoriaDiversidade[];
  /** Municípios (chave `municipioChave`) dos portos em que a pessoa está inscrita. */
  municipios: string[];
  /** Salário informado no cadastro (Ethos). */
  salarioInicial: number | null;
  /** Participou de pelo menos um processo seletivo ("pessoa acessada"). */
  acessada: boolean;
}

export interface ContratacaoIndicador {
  naveganteId: string;
  vagaId: string;
  destinoId: string;
  /** Município da empresa (ou da vaga, se ela tiver endereço próprio). */
  municipio: string;
  inicio: Date;
  fim: Date | null;
  salario: number | null;
}

export interface VagaIndicador {
  id: string;
  destinoId: string;
  municipio: string;
  publicadaEm: Date;
  preenchida: boolean;
}

export interface CursoConcluidoIndicador {
  naveganteId: string;
  /** Nome normalizado do curso ou trilha (agrupa cursos realizados e cursos da plataforma). */
  curso: string;
  concluidoEm: Date | null;
  municipio: string | null;
}

export interface EmpresaIndicador {
  id: string;
  municipio: string | null;
  cadastradaEm: Date;
  /** Quantidade de portos que a empresa apadrinha (`EmpresaPorto`). */
  portosApadrinhados: number;
}

export interface MunicipioPrioritarioIndicador {
  municipio: string;
  nome: string;
  uf: string;
  populacaoEconomicamenteAtiva: number | null;
}

export interface BaseIndicadores {
  pessoas: PessoaIndicador[];
  contratacoes: ContratacaoIndicador[];
  vagas: VagaIndicador[];
  cursosConcluidos: CursoConcluidoIndicador[];
  empresas: EmpresaIndicador[];
  municipiosPrioritarios: MunicipioPrioritarioIndicador[];
}

/** "Porto Alegre", "rs" → "PORTO ALEGRE/RS". Usado para cruzar endereços por município. */
export function municipioChave(cidade: string | null | undefined, uf: string | null | undefined): string | null {
  if (!cidade || !uf) return null;
  const nome = cidade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toUpperCase();
  return `${nome}/${uf.trim().toUpperCase()}`;
}

export function dentro(data: Date | null | undefined, periodo?: Periodo): boolean {
  if (!data) return false;
  if (!periodo) return true;
  return data >= periodo.inicio && data <= periodo.fim;
}

/** Contratação vigente na data de referência. */
export function ativa(c: ContratacaoIndicador, referencia: Date): boolean {
  return c.inicio <= referencia && (c.fim === null || c.fim > referencia);
}

export function razao(numerador: number, denominador: number): number | null {
  return denominador > 0 ? numerador / denominador : null;
}

export function media(valores: number[]): number | null {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
}

export function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function meses(de: Date, ate: Date): number {
  return (ate.getTime() - de.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

export function arredondar(valor: number | null, casas = 2): number | null {
  if (valor === null || !Number.isFinite(valor)) return null;
  const f = 10 ** casas;
  return Math.round(valor * f) / f;
}

/** Contratações da pessoa, da mais antiga para a mais recente. */
export function contratacoesPorPessoa(contratacoes: ContratacaoIndicador[]): Map<string, ContratacaoIndicador[]> {
  const mapa = new Map<string, ContratacaoIndicador[]>();
  for (const c of contratacoes) {
    const lista = mapa.get(c.naveganteId) ?? [];
    lista.push(c);
    mapa.set(c.naveganteId, lista);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  return mapa;
}

/** Salário atual: o da contratação vigente mais recente; senão, o da última contratação. */
export function salarioAtual(lista: ContratacaoIndicador[] | undefined, referencia: Date): number | null {
  if (!lista?.length) return null;
  const vigentes = lista.filter((c) => ativa(c, referencia) && c.salario !== null);
  const escolhida = (vigentes.length ? vigentes : lista.filter((c) => c.salario !== null)).at(-1);
  return escolhida?.salario ?? null;
}
