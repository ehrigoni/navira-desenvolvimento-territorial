// Regras de negócio do porto: assinatura, crédito de contratação e cotas de apoio.
import type { CategoriaIniciativa, Modalidade } from "@prisma/client";

/** Assinatura anual do porto (R$ 1.300,00). Dá direito a contratar um empregado pela plataforma. */
export const VALOR_ASSINATURA_ANUAL_CENTAVOS = 130_000;

/** Valor de cada empregado contratado via plataforma (um crédito de contratação). */
export const VALOR_CREDITO_CONTRATACAO_CENTAVOS = 130_000;

/**
 * Valor de uma cota de apoio a outro porto.
 * PROVISÓRIO: o valor não foi definido nas regras de negócio. Confirmar antes de ir para produção.
 */
export const VALOR_COTA_APOIO_CENTAVOS = 130_000;

export const MODALIDADES_FORMULARIO: Record<string, Modalidade> = {
  PRESENCIAL: "PRESENCIAL",
  ONLINE: "REMOTA",
  AMBOS: "HIBRIDA",
};

export const CATEGORIA_INICIATIVA_ROTULO: Record<CategoriaIniciativa, string> = {
  CURSO: "curso",
  VAGA_EMPREGO: "vaga de emprego",
  VOLUNTARIADO: "voluntariado",
  MUTIRAO: "mutirão",
  EVENTO: "evento",
};

/** A assinatura vale até a data registrada no porto (1 ano a cada pagamento). */
export function assinaturaAtiva(porto: { assinaturaAteEm: Date | null }, agora = new Date()) {
  return !!porto.assinaturaAteEm && porto.assinaturaAteEm.getTime() > agora.getTime();
}

/** Nova data de vencimento: soma um ano ao vencimento atual, ou a partir de hoje se já venceu. */
export function proximoVencimentoAssinatura(atual: Date | null, agora = new Date()) {
  const base = atual && atual.getTime() > agora.getTime() ? atual : agora;
  const novo = new Date(base);
  novo.setUTCFullYear(novo.getUTCFullYear() + 1);
  return novo;
}
