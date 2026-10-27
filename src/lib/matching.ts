// Compatibilidade inicial de vagas por local. Parte do matching de docs/navegante/matchingVagas.md.
// Ainda sem Ethos (docs/navegante/questionarioEthos.md está vazio), então o índice usa só a proximidade.
export type Local = { cidade: string | null; uf: string | null };

export function normalizarCidade(cidade: string) {
  return cidade.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toUpperCase();
}

/** 100 = mesma cidade de um porto; 50 = mesma UF; 0 = fora da região (ou sem portos). */
export function indiceLocal(vaga: Local, portos: Local[]): number {
  if (!portos.length || !vaga.uf) return 0;
  const mesmaCidade = portos.some(
    (p) => p.cidade && vaga.cidade && p.uf === vaga.uf && normalizarCidade(p.cidade) === normalizarCidade(vaga.cidade),
  );
  if (mesmaCidade) return 100;
  return portos.some((p) => p.uf === vaga.uf) ? 50 : 0;
}

export function formatarSalario(valor: { toString(): string } | null) {
  if (valor === null) return null;
  return Number(valor.toString()).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
