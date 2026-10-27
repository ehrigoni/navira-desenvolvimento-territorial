// Ponto de entrada dos indicadores: Navira em Números + Navira Impact Score (IIP e IDT).
import type { PrismaClient } from "@prisma/client";
import { Periodo } from "./comum";
import { carregarBaseIndicadores } from "./carregar";
import { calcularEmNumeros } from "./em-numeros";
import { calcularImpactScore } from "./impact-score";

export * from "./comum";
export * from "./em-numeros";
export * from "./inclusao-produtiva";
export * from "./desenvolvimento-territorial";
export * from "./impact-score";

/** Últimos 12 meses até `referencia`. */
export function ultimos12Meses(referencia = new Date()): Periodo {
  const inicio = new Date(referencia);
  inicio.setFullYear(inicio.getFullYear() - 1);
  return { inicio, fim: referencia };
}

export async function gerarIndicadores(prisma: PrismaClient, periodo: Periodo = ultimos12Meses()) {
  const base = await carregarBaseIndicadores(prisma);
  return {
    periodo,
    emNumeros: calcularEmNumeros(base, { referencia: periodo.fim, periodo }),
    impactScore: calcularImpactScore(base, periodo),
  };
}
