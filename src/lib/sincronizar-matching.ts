// Regrava o [Matching-Navegante] (docs/navegante/matchingVagas.md) só quando o conteúdo muda.
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assinarPerfil, montarPerfilMatching } from "@/lib/matching-navegante";

export async function sincronizarMatching(naveganteId: string, cliente: Pick<Prisma.TransactionClient, "navegante" | "matchingNavegante"> = db) {
  const navegante = await cliente.navegante.findUniqueOrThrow({
    where: { id: naveganteId },
    select: {
      ethosConcluidoEm: true,
      portos: { select: { porto: { select: { id: true, cep: true, cidade: true, uf: true } } } },
      CursoRealizado: { select: { curso: true, cargaHoraria: true, modalidade: true } },
    },
  });

  const perfil = montarPerfilMatching({
    portos: navegante.portos.map((i) => i.porto),
    cursosRealizados: navegante.CursoRealizado,
    ethosConcluido: !!navegante.ethosConcluidoEm,
  });
  const assinatura = assinarPerfil(perfil);

  const atual = await cliente.matchingNavegante.findUnique({ where: { naveganteId }, select: { assinatura: true } });
  if (atual?.assinatura === assinatura) return;

  const json = perfil as unknown as Prisma.InputJsonValue;
  await cliente.matchingNavegante.upsert({
    where: { naveganteId },
    create: { naveganteId, perfil: json, assinatura, atualizadoEm: new Date() },
    update: { perfil: json, assinatura, atualizadoEm: new Date() },
  });
}
