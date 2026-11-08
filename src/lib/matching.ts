// Compatibilidade de vagas com os portos do Navegante (docs/navegante/matchingVagas.md).
// Hoje o índice usa só proximidade geográfica: CEP, depois cidade/UF. Ethos e CNAE entram depois.

export type Localizacao = { cep?: string | null; cidade?: string | null; uf?: string | null };

export function normalizarCidade(cidade: string) {
  return cidade.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toUpperCase();
}

function digitos(cep: string | null | undefined) {
  return (cep ?? "").replace(/\D/g, "");
}

/**
 * Pontuação de proximidade de um local em relação aos portos (0 a 100):
 * 100 = mesmo CEP; 75 = mesmo CEP de 5 dígitos (mesmo bairro/setor); 50 = mesmos 3 primeiros dígitos;
 * 40 = mesma cidade e UF (sem CEP comparável); 20 = mesma UF; 0 = fora da região ou sem portos.
 */
export function calcularIndiceLocal(local: Localizacao, portos: Localizacao[]): number {
  let melhor = 0;
  const cepLocal = digitos(local.cep);
  for (const porto of portos) {
    const cepPorto = digitos(porto.cep);
    if (cepLocal.length === 8 && cepPorto.length === 8) {
      if (cepLocal === cepPorto) return 100;
      if (cepLocal.slice(0, 5) === cepPorto.slice(0, 5)) melhor = Math.max(melhor, 75);
      else if (cepLocal.slice(0, 3) === cepPorto.slice(0, 3)) melhor = Math.max(melhor, 50);
    }
    if (local.uf && porto.uf === local.uf) {
      const mesmaCidade = !!local.cidade && !!porto.cidade
        && normalizarCidade(local.cidade) === normalizarCidade(porto.cidade);
      melhor = Math.max(melhor, mesmaCidade ? 40 : 20);
    }
  }
  return melhor;
}

/** Valores monetários do banco são inteiros em centavos (ex.: 150000 = R$ 1.500,00). */
export function formatarCentavos(valor: number | null) {
  if (valor === null) return null;
  return (valor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Faixa salarial a partir de mínimo/máximo em centavos. */
export function formatarFaixaSalarial(min: number | null, max: number | null) {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) return `${formatarCentavos(min)} a ${formatarCentavos(max)}`;
  return formatarCentavos(min ?? max);
}
