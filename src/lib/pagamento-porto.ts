// Confirma uma cobrança do porto e aplica o efeito dela (assinatura, crédito ou cota).
// Ponto único de entrada: o gateway de pagamento (quando existir) deve chamar esta função.
import { db } from "@/lib/db";
import { assinaturaAtiva, proximoVencimentoAssinatura } from "@/lib/porto-regras";
import { Prisma } from "@prisma/client";

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

    if (pagamento.tipo === "COTA_APOIO" && (!pagamento.afilhadoId || pagamento.afilhadoId === pagamento.portoId)) {
      throw new Error("Cobrança de apoio sem porto beneficiário válido.");
    }

    const beneficiarioId = pagamento.tipo === "COTA_APOIO" ? pagamento.afilhadoId! : pagamento.portoId;
    const portos = [...new Set([pagamento.portoId, beneficiarioId])].sort();
    // A ordem fixa evita impasses entre pagamentos e transferências concorrentes.
    await tx.$queryRaw`SELECT id FROM "Porto" WHERE id IN (${Prisma.join(portos)}) ORDER BY id FOR UPDATE`;
    const porto = await tx.porto.findUniqueOrThrow({ where: { id: pagamento.portoId }, select: { assinaturaAteEm: true } });
    if (pagamento.tipo === "ASSINATURA_ANUAL" || !assinaturaAtiva(porto)) {
      await tx.porto.update({
        where: { id: pagamento.portoId },
        data: { assinaturaAteEm: proximoVencimentoAssinatura(porto.assinaturaAteEm) },
      });
    }

    await tx.porto.update({
      where: { id: beneficiarioId },
      data: { creditosContratacao: { increment: pagamento.quantidade } },
    });
    if (pagamento.tipo === "COTA_APOIO") {
      await tx.apadrinhamento.upsert({
        where: { padrinhoId_afilhadoId: { padrinhoId: pagamento.portoId, afilhadoId: beneficiarioId } },
        create: { padrinhoId: pagamento.portoId, afilhadoId: beneficiarioId, cotas: pagamento.quantidade },
        update: { cotas: { increment: pagamento.quantidade } },
      });
    }
    return { aplicado: true as const };
  });
}
