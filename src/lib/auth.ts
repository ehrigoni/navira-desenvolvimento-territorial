// Protege áreas do app: quem não tem sessão vai ao login; quem tem papel de outra área vai à sua.
import { redirect } from "next/navigation";
import { lerSessao, type Papel, type Sessao } from "./session";

export async function exigirSessao(papel: Papel): Promise<Sessao> {
  const sessao = await lerSessao();
  if (!sessao) redirect("/entrar");
  if (sessao.papel !== papel) redirect(sessao.papel === "PORTO" ? "/porto" : "/navegante");
  return sessao;
}
