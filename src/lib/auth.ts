// Protege áreas do app: quem não tem sessão vai ao login; quem tem papel de outra área vai à sua.
import { redirect } from "next/navigation";
import { lerSessao, type Papel, type Sessao } from "./session";
import { db } from "./db";

export async function obterSessaoAtiva(): Promise<Sessao | null> {
  const sessao = await lerSessao();
  if (!sessao) return null;
  if (sessao.papel === "ADMIN") {
    const admin = await db.administrador.findUnique({ where: { id: sessao.sub }, select: { ativo: true, aprovacaoPendente: true } });
    return admin?.ativo && !admin.aprovacaoPendente ? sessao : null;
  }
  if (sessao.papel !== "PORTO" && sessao.papel !== "NAVEGANTE") return null;
  const usuario = await db.usuario.findUnique({
    where: { id: sessao.sub },
    select: { ativo: true, papel: true, porto: { select: { status: true, aprovacaoPendente: true } } },
  });
  if (!usuario?.ativo || usuario.papel !== sessao.papel) return null;
  if (sessao.papel === "PORTO" && (!usuario.porto || usuario.porto.aprovacaoPendente || !["ATIVO", "EM_ANALISE"].includes(usuario.porto.status))) return null;
  return sessao;
}

export async function exigirSessao(papel: Papel): Promise<Sessao> {
  const sessao = await lerSessao();
  if (!sessao) redirect(papel === "ADMIN" ? "/admin" : "/entrar");
  if (sessao.papel !== papel) redirect(sessao.papel === "ADMIN" ? "/admin" : sessao.papel === "PORTO" ? "/porto" : "/navegante");
  if (papel === "ADMIN") {
    const admin = await db.administrador.findUnique({ where: { id: sessao.sub }, select: { ativo: true, aprovacaoPendente: true, trocarSenha: true } });
    if (!admin?.ativo || admin.aprovacaoPendente) redirect("/admin");
    if (admin.trocarSenha) redirect("/admin/senha");
  } else {
    const usuario = await db.usuario.findUnique({
      where: { id: sessao.sub },
      select: { ativo: true, papel: true, porto: { select: { status: true, aprovacaoPendente: true } } },
    });
    if (!usuario?.ativo || usuario.papel !== papel) redirect("/entrar");
    if (papel === "PORTO" && (!usuario.porto || usuario.porto.aprovacaoPendente || !["ATIVO", "EM_ANALISE"].includes(usuario.porto.status))) {
      redirect("/entrar?mensagem=porto-indisponivel");
    }
  }
  return sessao;
}

export async function exigirAdministradorParaTrocarSenha(): Promise<Sessao> {
  const sessao = await lerSessao();
  if (!sessao || sessao.papel !== "ADMIN") redirect("/admin");
  const admin = await db.administrador.findUnique({ where: { id: sessao.sub }, select: { ativo: true, aprovacaoPendente: true } });
  if (!admin?.ativo || admin.aprovacaoPendente) redirect("/admin");
  return sessao;
}
