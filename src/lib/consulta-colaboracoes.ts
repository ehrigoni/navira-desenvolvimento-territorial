import { Prisma } from "@prisma/client";

export function incluirMetasColaboracao(portoId?: string) {
  return Prisma.validator<Prisma.MetaColaboracaoDefaultArgs>()({
    include: {
      contribuicoes: {
        orderBy: { criadaEm: "asc" },
        select: {
          id: true, quantidade: true, status: true, criadaEm: true, portoId: true, naveganteId: true,
          porto: { select: { nome: true } },
          navegante: { select: {
            nomeSocial: true, usuario: { select: { nome: true } },
            Contratacao: { where: { encerradaEm: null, ...(portoId ? { portoId: { not: portoId } } : {}) }, select: { id: true } },
          } },
        },
      },
    },
  });
}
