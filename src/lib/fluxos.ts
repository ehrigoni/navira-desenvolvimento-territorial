// Para onde cada perfil vai depois do login (docs/entrada/fluxos-agentes.md).
import type { EthosStatus, Papel } from "@prisma/client";

export function destinoPosLogin(usuario: { papel: Papel; ethosStatus?: EthosStatus | null }) {
  if (usuario.papel === "PORTO") return "/porto";
  // Navegante sem Ethos concluído volta ao questionário no ponto em que parou.
  return usuario.ethosStatus === "CONCLUIDO" ? "/navegante" : "/navegante/ethos";
}
