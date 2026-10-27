// [Índice de Desenvolvimento Territorial — IDT] — NAVIRA-ImpactScore-IndiceDesenvolvimentoTerritorial.docx
// Peso no Navira Impact Score: 20%.
import {
  BaseIndicadores, Periodo, arredondar, ativa, contratacoesPorPessoa, dentro, media, razao, salarioAtual,
} from "./comum";

/**
 * Composição do documento: 30% Cobertura, 40% Conexão Local, 20% Retenção (soma 90%).
 * Os 10% restantes não foram definidos; o índice é normalizado pela soma dos pesos.
 * Quando o peso que falta for definido (ex.: Densidade de Oportunidades), basta incluí-lo aqui.
 */
export const PESOS_IDT = { cobertura: 0.3, conexaoLocal: 0.4, retencao: 0.2 } as const;

export interface ImpactoMunicipio {
  municipio: string;
  prioritario: boolean;
  vagas: { atual: number; anterior: number; variacao: number };
  rendaMedia: { atual: number | null; anterior: number | null; variacao: number | null };
  empresasParticipantes: { atual: number; anterior: number; variacao: number };
  cursosConcluidos: { atual: number; anterior: number; variacao: number };
  /** Vagas do período por mil pessoas da população economicamente ativa (só municípios com PEA cadastrada). */
  densidadeOportunidades: number | null;
  contratacoes: number;
  /** Peso para o mapa de calor: contratações + vagas + cursos concluídos no período. */
  intensidade: number;
}

export interface IndiceDesenvolvimentoTerritorial {
  /** 0–100. */
  indice: number | null;
  coberturaTerritorial: { valor: number | null; impactados: string[]; prioritarios: number };
  taxaConexaoLocal: { valor: number | null; locais: number; total: number };
  retencaoTerritorial: { valor: number | null; retidas: number; inseridas: number };
  parceriaEstruturante: number;
  municipios: ImpactoMunicipio[];
}

/** Período de mesma duração imediatamente anterior, para medir "aumento". */
export function periodoAnterior(p: Periodo): Periodo {
  const duracao = p.fim.getTime() - p.inicio.getTime();
  return { inicio: new Date(p.inicio.getTime() - duracao - 1), fim: new Date(p.inicio.getTime() - 1) };
}

export function calcularDesenvolvimentoTerritorial(
  base: BaseIndicadores,
  periodo: Periodo,
): IndiceDesenvolvimentoTerritorial {
  const anterior = periodoAnterior(periodo);
  const pessoas = new Map(base.pessoas.map((p) => [p.id, p]));
  const prioritarios = new Map(base.municipiosPrioritarios.map((m) => [m.municipio, m]));
  const porPessoa = contratacoesPorPessoa(base.contratacoes);
  const contratacoesPeriodo = base.contratacoes.filter((c) => dentro(c.inicio, periodo));

  // Taxa de Conexão Local: contratação em município de algum porto da pessoa ÷ total de contratações.
  const locais = contratacoesPeriodo.filter((c) => pessoas.get(c.naveganteId)?.municipios.includes(c.municipio)).length;

  // Retenção Territorial: inseridas = pessoas com a primeira contratação no período;
  // retidas = ainda atuando (contratação vigente no fim do período) no município da primeira contratação.
  let inseridas = 0;
  let retidas = 0;
  for (const lista of porPessoa.values()) {
    const primeira = lista[0];
    if (!dentro(primeira.inicio, periodo)) continue;
    inseridas++;
    if (lista.some((c) => ativa(c, periodo.fim) && c.municipio === primeira.municipio)) retidas++;
  }

  // Impacto territorial por município.
  const todos = new Set<string>([
    ...prioritarios.keys(),
    ...base.vagas.map((v) => v.municipio),
    ...base.contratacoes.map((c) => c.municipio),
    ...base.cursosConcluidos.map((c) => c.municipio).filter((m): m is string => !!m),
    ...base.empresas.map((e) => e.municipio).filter((m): m is string => !!m),
  ]);

  const rendaMedia = (municipio: string, p: Periodo) => {
    const ids = new Set(base.contratacoes.filter((c) => c.municipio === municipio && c.inicio <= p.fim).map((c) => c.naveganteId));
    return media([...ids].map((id) => salarioAtual(porPessoa.get(id)?.filter((c) => c.inicio <= p.fim), p.fim)).filter((s): s is number => s !== null));
  };
  const contar = <T>(lista: T[], filtro: (x: T) => boolean) => lista.filter(filtro).length;
  const serie = (fn: (p: Periodo) => number) => {
    const atual = fn(periodo);
    const ant = fn(anterior);
    return { atual, anterior: ant, variacao: atual - ant };
  };

  const municipios: ImpactoMunicipio[] = [...todos].map((m) => {
    const vagas = serie((p) => contar(base.vagas, (v) => v.municipio === m && dentro(v.publicadaEm, p)));
    // Empresas participantes = cadastradas no programa até o fim de cada período.
    const empresas = serie((p) => contar(base.empresas, (e) => e.municipio === m && e.cadastradaEm <= p.fim));
    const cursos = serie((p) => contar(base.cursosConcluidos, (c) => c.municipio === m && dentro(c.concluidoEm, p)));
    const rAtual = rendaMedia(m, periodo);
    const rAnterior = rendaMedia(m, anterior);
    const contratacoes = contar(contratacoesPeriodo, (c) => c.municipio === m);
    const pea = prioritarios.get(m)?.populacaoEconomicamenteAtiva ?? null;
    return {
      municipio: m,
      prioritario: prioritarios.has(m),
      vagas,
      rendaMedia: {
        atual: arredondar(rAtual),
        anterior: arredondar(rAnterior),
        variacao: arredondar(rAtual !== null && rAnterior !== null ? rAtual - rAnterior : null),
      },
      empresasParticipantes: empresas,
      cursosConcluidos: cursos,
      densidadeOportunidades: arredondar(pea ? (vagas.atual / pea) * 1000 : null, 4),
      contratacoes,
      intensidade: contratacoes + vagas.atual + cursos.atual,
    };
  }).sort((a, b) => b.intensidade - a.intensidade);

  // Cobertura Territorial: municípios prioritários com algum impacto no período ÷ municípios prioritários.
  const impactados = municipios.filter((m) => m.prioritario && m.intensidade > 0).map((m) => m.municipio);
  const cobertura = razao(impactados.length, prioritarios.size);
  const conexao = razao(locais, contratacoesPeriodo.length);
  const retencao = razao(retidas, inseridas);

  const partes = [
    [PESOS_IDT.cobertura, cobertura],
    [PESOS_IDT.conexaoLocal, conexao],
    [PESOS_IDT.retencao, retencao],
  ].filter(([, v]) => v !== null) as [number, number][];
  const somaPesos = partes.reduce((s, [w]) => s + w, 0);
  const indice = somaPesos ? (partes.reduce((s, [w, v]) => s + w * v, 0) / somaPesos) * 100 : null;

  return {
    indice: arredondar(indice),
    coberturaTerritorial: { valor: arredondar(cobertura === null ? null : cobertura * 100), impactados, prioritarios: prioritarios.size },
    taxaConexaoLocal: { valor: arredondar(conexao === null ? null : conexao * 100), locais, total: contratacoesPeriodo.length },
    retencaoTerritorial: { valor: arredondar(retencao === null ? null : retencao * 100), retidas, inseridas },
    parceriaEstruturante: base.empresas.filter((e) => e.portosApadrinhados > 0).length,
    municipios,
  };
}
