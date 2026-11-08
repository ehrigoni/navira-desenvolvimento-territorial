// Confirma uma cobrança do porto e aplica o efeito dela (assinatura, crédito ou cota).
// Ponto único de entrada: o gateway de pagamento (quando existir) deve chamar esta função.
import { db } from "@/lib/db";
import { proximoVencimentoAssinatura } from "@/lib/porto-regras";

/** Marca a cobrança como paga e aplica o efeito. Idempotente: uma cobrança só é aplicada uma vez. */
export async function confirmarPagamentoPorto(pagamentoId: string) {
  return db.$transaction(async (tx) => {
    const pagamento = await tx.pagamentoPorto.findUnique({ where: { id: pagamentoId } });
    if (!pagamento) return { aplicado: false as const, motivo: "nao-encontrado" as const };

    // Só transiciona de PENDENTE para PAGO; se outra chamada já pagou, não aplica de novo.
    const marcado = await tx.pagamentoPorto.updateMany({
      where: { id: pagamentoId, status: "PENDENTE" },
      data: { status: "PAGO", pagoEm: new Date() },
    });
    if (marcado.count === 0) return { aplicado: false as const, motivo: "ja-pago" as const };

    if (pagamento.tipo === "ASSINATURA_ANUAL") {
      const porto = await tx.porto.findUniqueOrThrow({ where: { id: pagamento.portoId }, select: { assinaturaAteEm: true } });
      await tx.porto.update({
        where: { id: pagamento.portoId },
        data: {
          assinaturaAteEm: proximoVencimentoAssinatura(porto.assinaturaAteEm),
          creditosContratacao: { increment: pagamento.quantidade },
        },
      });
    } else if (pagamento.tipo === "CREDITO_CONTRATACAO") {
      await tx.porto.update({
        where: { id: pagamento.portoId },
        data: { creditosContratacao: { increment: pagamento.quantidade } },
      });
    } else if (pagamento.tipo === "COTA_APOIO" && pagamento.afilhadoId) {
      await tx.apadrinhamento.updateMany({
        where: { padrinhoId: pagamento.portoId, afilhadoId: pagamento.afilhadoId },
        data: { cotas: { increment: pagamento.quantidade } },
      });
    }

    return { aplicado: true as const };
  });
}
