// [Navira em Números] — NAVIRA-EmNumeros.docx
import {
  BaseIndicadores, Periodo, arredondar, contratacoesPorPessoa, dentro, media, mediana, meses, salarioAtual,
} from "./comum";

export interface OpcoesEmNumeros {
  referencia?: Date;
  periodo?: Periodo;
  /** Dias sem atividade a partir dos quais a pessoa deixa de ser "ativa". */
  diasAtividade?: number;
  /** Mínimo de pessoas com renda conhecida para um curso entrar no ranking. */
  amostraMinimaCurso?: number;
}

export interface NaviraEmNumeros {
  pessoasCadastradas: number;
  pessoasAtivas: number;
  vagasPublicadas: number;
  vagasPreenchidas: number;
  /** Média de (salário atual − salário inicial) entre pessoas contratadas com os dois valores. */
  aumentoMedioRenda: number | null;
  aumentoMedioRendaPercentual: number | null;
  /** Meses desde o cadastro até o primeiro salário ≥ 2× o salário inicial. */
  tempoParaDobrarRenda: { mediaMeses: number | null; medianaMeses: number | null; pessoasQueDobraram: number };
  cursosQueMaisGeramRenda: { curso: string; aumentoMedio: number; pessoas: number }[];
  municipiosComMaisOportunidades: { municipio: string; vagas: number; contratacoes: number }[];
}

export function calcularEmNumeros(base: BaseIndicadores, opcoes: OpcoesEmNumeros = {}): NaviraEmNumeros {
  const referencia = opcoes.referencia ?? new Date();
  const { periodo } = opcoes;
  const diasAtividade = opcoes.diasAtividade ?? 90;
  const amostraMinima = opcoes.amostraMinimaCurso ?? 3;
  const limiteAtividade = new Date(referencia.getTime() - diasAtividade * 86_400_000);

  const pessoas = base.pessoas.filter((p) => p.cadastradoEm <= referencia);
  const vagas = base.vagas.filter((v) => dentro(v.publicadaEm, periodo));
  const porPessoa = contratacoesPorPessoa(base.contratacoes);

  // Renda: diferença entre o salário atual e o salário inicial de cada pessoa.
  const ganhos = new Map<string, { absoluto: number; percentual: number | null }>();
  const temposDobra: number[] = [];
  for (const p of pessoas) {
    const lista = porPessoa.get(p.id);
    const atual = salarioAtual(lista, referencia);
    if (p.salarioInicial === null || atual === null) continue;
    ganhos.set(p.id, {
      absoluto: atual - p.salarioInicial,
      percentual: p.salarioInicial > 0 ? (atual - p.salarioInicial) / p.salarioInicial : null,
    });
    if (p.salarioInicial > 0) {
      const dobra = lista!.find((c) => c.salario !== null && c.salario >= 2 * p.salarioInicial!);
      if (dobra) temposDobra.push(Math.max(0, meses(p.cadastradoEm, dobra.inicio)));
    }
  }

  // Curso/trilha que gera mais renda: aumento médio de quem concluiu o curso.
  const porCurso = new Map<string, Set<string>>();
  for (const c of base.cursosConcluidos) {
    if (!ganhos.has(c.naveganteId)) continue;
    const set = porCurso.get(c.curso) ?? new Set<string>();
    set.add(c.naveganteId);
    porCurso.set(c.curso, set);
  }
  const cursos = [...porCurso.entries()]
    .filter(([, ids]) => ids.size >= amostraMinima)
    .map(([curso, ids]) => ({
      curso,
      aumentoMedio: arredondar(media([...ids].map((id) => ganhos.get(id)!.absoluto)))!,
      pessoas: ids.size,
    }))
    .sort((a, b) => b.aumentoMedio - a.aumentoMedio);

  // Município que gera mais oportunidades: vagas publicadas no período (desempate: contratações).
  const porMunicipio = new Map<string, { vagas: number; contratacoes: number }>();
  const item = (m: string) => porMunicipio.get(m) ?? porMunicipio.set(m, { vagas: 0, contratacoes: 0 }).get(m)!;
  for (const v of vagas) item(v.municipio).vagas++;
  for (const c of base.contratacoes) if (dentro(c.inicio, periodo)) item(c.municipio).contratacoes++;
  const municipios = [...porMunicipio.entries()]
    .map(([municipio, n]) => ({ municipio, ...n }))
    .sort((a, b) => b.vagas - a.vagas || b.contratacoes - a.contratacoes);

  const valores = [...ganhos.values()];
  const percentuais = valores.map((g) => g.percentual).filter((x): x is number => x !== null);
  return {
    pessoasCadastradas: pessoas.length,
    pessoasAtivas: pessoas.filter((p) => p.ultimaAtividadeEm && p.ultimaAtividadeEm >= limiteAtividade).length,
    vagasPublicadas: vagas.length,
    vagasPreenchidas: vagas.filter((v) => v.preenchida).length,
    aumentoMedioRenda: arredondar(media(valores.map((g) => g.absoluto))),
    aumentoMedioRendaPercentual: arredondar(media(percentuais) === null ? null : media(percentuais)! * 100),
    tempoParaDobrarRenda: {
      mediaMeses: arredondar(media(temposDobra), 1),
      medianaMeses: arredondar(mediana(temposDobra), 1),
      pessoasQueDobraram: temposDobra.length,
    },
    cursosQueMaisGeramRenda: cursos.slice(0, 10),
    municipiosComMaisOportunidades: municipios.slice(0, 10),
  };
}
