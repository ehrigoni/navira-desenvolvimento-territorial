import { Prisma } from "@prisma/client";
import { db } from "./db";

type Apoiador = { papel: "PORTO" | "NAVEGANTE"; id: string };

export async function registrarColaboracao(metaId: string, quantidade: Prisma.Decimal, apoiador: Apoiador) {
  return db.$transaction(async (tx) => {
    const meta = await tx.metaColaboracao.findUnique({ where: { id: metaId }, select: { iniciativaId: true } });
    if (!meta) return false;
    await tx.$queryRaw`SELECT id FROM "IniciativaPorto" WHERE id = ${meta.iniciativaId} FOR UPDATE`;
    const iniciativa = await tx.iniciativaPorto.findFirst({
      where: {
        id: meta.iniciativaId,
        status: "ABERTO",
        ...(apoiador.papel === "NAVEGANTE"
          ? { Porto: { inscritos: { some: { naveganteId: apoiador.id } } } }
          : { portoId: { not: apoiador.id } }),
      },
      select: { id: true },
    });
    if (!iniciativa) return false;
    if (apoiador.papel === "PORTO") {
      await tx.apoioIniciativa.upsert({
        where: { iniciativaId_portoId: { iniciativaId: iniciativa.id, portoId: apoiador.id } },
        create: { iniciativaId: iniciativa.id, portoId: apoiador.id },
        update: {},
      });
    } else {
      await tx.apoioIniciativa.upsert({
        where: { iniciativaId_naveganteId: { iniciativaId: iniciativa.id, naveganteId: apoiador.id } },
        create: { iniciativaId: iniciativa.id, naveganteId: apoiador.id },
        update: {},
      });
    }
    await tx.contribuicaoIniciativa.create({
      data: { metaId, quantidade, ...(apoiador.papel === "PORTO" ? { portoId: apoiador.id } : { naveganteId: apoiador.id }) },
    });
    return true;
  });
}
