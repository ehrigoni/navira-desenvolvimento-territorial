// [Matching-Navegante] (docs/navegante/matchingVagas.md): perfil JSON usado no matching.
// Só é regravado quando a assinatura muda (mudança de portos, cursos realizados ou Ethos).
import { createHash } from "node:crypto";

export type PerfilMatching = {
  versao: 1;
  portos: { id: string; cep: string | null; cidade: string | null; uf: string | null }[];
  cursosRealizados: { curso: string; cargaHoraria: number; modalidade: string | null }[];
  ethosConcluido: boolean;
};

export function montarPerfilMatching(entrada: {
  portos: PerfilMatching["portos"];
  cursosRealizados: PerfilMatching["cursosRealizados"];
  ethosConcluido: boolean;
}): PerfilMatching {
  return {
    versao: 1,
    portos: [...entrada.portos].sort((a, b) => a.id.localeCompare(b.id)),
    cursosRealizados: [...entrada.cursosRealizados].sort((a, b) => a.curso.localeCompare(b.curso)),
    ethosConcluido: entrada.ethosConcluido,
  };
}

/** Serialização estável (chaves ordenadas) para que o mesmo perfil gere sempre a mesma assinatura. */
function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  if (valor && typeof valor === "object") {
    const entradas = Object.keys(valor).sort().map((k) => `${JSON.stringify(k)}:${canonico((valor as Record<string, unknown>)[k])}`);
    return `{${entradas.join(",")}}`;
  }
  return JSON.stringify(valor) ?? "null";
}

export function assinarPerfil(perfil: PerfilMatching): string {
  return createHash("sha256").update(canonico(perfil)).digest("hex");
}
