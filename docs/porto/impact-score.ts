// [Navira Impact Score]
// Componentes definidos até agora: IIP (30%) e IDT (20%). Os outros 50% ainda não foram especificados,
// então o score sai como "parcial": a média ponderada dos componentes conhecidos, reescalada para 0–100.
import { BaseIndicadores, Periodo, arredondar } from "./comum";
import { calcularInclusaoProdutiva, IndiceInclusaoProdutiva } from "./inclusao-produtiva";
import { calcularDesenvolvimentoTerritorial, IndiceDesenvolvimentoTerritorial } from "./desenvolvimento-territorial";

export const PESOS_IMPACT_SCORE = { inclusaoProdutiva: 0.3, desenvolvimentoTerritorial: 0.2 } as const;

export interface NaviraImpactScore {
  /** 0–100, sobre os componentes já definidos. */
  scoreParcial: number | null;
  /** Fração do score total coberta pelos componentes definidos (0.5 = 50%). */
  cobertura: number;
  inclusaoProdutiva: IndiceInclusaoProdutiva;
  desenvolvimentoTerritorial: IndiceDesenvolvimentoTerritorial;
}

export function calcularImpactScore(base: BaseIndicadores, periodo: Periodo): NaviraImpactScore {
  const iip = calcularInclusaoProdutiva(base, periodo);
  const idt = calcularDesenvolvimentoTerritorial(base, periodo);
  const partes = [
    [PESOS_IMPACT_SCORE.inclusaoProdutiva, iip.indice],
    [PESOS_IMPACT_SCORE.desenvolvimentoTerritorial, idt.indice],
  ].filter(([, v]) => v !== null) as [number, number][];
  const soma = partes.reduce((s, [w]) => s + w, 0);
  return {
    scoreParcial: arredondar(soma ? partes.reduce((s, [w, v]) => s + w * v, 0) / soma : null),
    cobertura: PESOS_IMPACT_SCORE.inclusaoProdutiva + PESOS_IMPACT_SCORE.desenvolvimentoTerritorial,
    inclusaoProdutiva: iip,
    desenvolvimentoTerritorial: idt,
  };
}
