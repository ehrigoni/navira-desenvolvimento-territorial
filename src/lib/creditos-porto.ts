import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function transferirCreditosPorto(padrinhoId: string, afilhadoId: string, quantidade: number) {
  if (!afilhadoId || padrinhoId === afilhadoId || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100) {
    return "invalido" as const;
  }

  return db.$transaction(async (tx) => {
    const ids = [padrinhoId, afilhadoId].sort();
    const portos = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Porto" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
    if (portos.length !== 2) return "invalido" as const;
    const debito = await tx.porto.updateMany({
      where: { id: padrinhoId, creditosContratacao: { gte: quantidade } },
      data: { creditosContratacao: { decrement: quantidade } },
    });
    if (debito.count === 0) return "sem-credito" as const;
    await tx.porto.update({
      where: { id: afilhadoId },
      data: { creditosContratacao: { increment: quantidade } },
    });
    await tx.apadrinhamento.upsert({
      where: { padrinhoId_afilhadoId: { padrinhoId, afilhadoId } },
      create: { padrinhoId, afilhadoId, cotas: quantidade },
      update: { cotas: { increment: quantidade } },
    });
    return "transferido" as const;
  });
}
