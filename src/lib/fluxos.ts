// Para onde cada perfil vai depois do login (docs/entrada/fluxos-agentes.md).
import type { Papel } from "@prisma/client";

export function destinoPosLogin(usuario: { papel: Papel; questionarioConcluido?: boolean }) {
  if (usuario.papel === "PORTO") return "/porto";
  return usuario.questionarioConcluido ? "/navegante" : "/navegante/ethos";
}
