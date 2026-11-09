import Link from "next/link";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { formatarCentavos } from "@/lib/matching";
import { alterarAdministrador, alterarPorto, alterarUsuario, aprovarAdministrador, criarAdministrador } from "./actions";
import IdentificadorInput from "../IdentificadorInput";
import AbasPainelAdmin from "./AbasPainelAdmin";
import { municipioComMaisVagas } from "@/lib/impacto";
import LinhaPortoAdmin from "./LinhaPortoAdmin";

function grafico(itens: { nome: string; quantidade: number }[]) {
  const maximo = Math.max(1, ...itens.map((item) => item.quantidade));
  return <div className="admin-grafico">{itens.map((item) => <div key={item.nome}>
    <div className="admin-grafico-rotulo"><span>{item.nome}</span><strong>{item.quantidade}</strong></div>
    <div className="admin-trilho"><div className="admin-barra" style={{ width: `${item.quantidade / maximo * 100}%` }} /></div>
  </div>)}</div>;
}

function controle(action: (form: FormData) => Promise<void>, id: string, campo: string, valor: string, rotulo: string) {
  return <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name={campo} value={valor} /><button className="botao secundario">{rotulo}</button></form>;
}

export default async function PainelAdmin({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const sessao = await exigirSessao("ADMIN");
  const { aviso } = await searchParams;
  const [usuarios, portos, vagas, cursos, iniciativas, recursos, empresas, administradores, pagamentos, pedidos, inscritosCursosEmpresa, pessoasCadastradas, pessoasAtivas, contratacoesRegistradas, contratacoesAtivas, cursosConcluidos, parceriasApadrinhamento, vagasComTerritorio] = await Promise.all([
    db.usuario.findMany({ where: { papel: { in: ["NAVEGANTE", "DESTINO"] } }, select: { id: true, nome: true, papel: true, ativo: true }, orderBy: { nome: "asc" } }),
    db.porto.findMany({ select: { id: true, nome: true, tipo: true, cidade: true, uf: true, status: true, aprovacaoPendente: true, _count: { select: { inscritos: true, vagas: true, cursos: true } } }, orderBy: { nome: "asc" } }),
    db.vaga.findMany({ select: { id: true, titulo: true, ativa: true, salarioMinCentavos: true, salarioMaxCentavos: true, porto: { select: { nome: true } }, destino: { select: { razaoSocial: true } } }, orderBy: { criadaEm: "desc" } }),
    db.curso.findMany({ select: { id: true, nome: true, porto: { select: { nome: true } }, destino: { select: { razaoSocial: true } }, _count: { select: { navegantes: true } } }, orderBy: { nome: "asc" } }),
    db.iniciativaPorto.findMany({ select: { id: true, titulo: true, status: true, Porto: { select: { nome: true } } }, orderBy: { criadaEm: "desc" } }),
    db.pedidoRecurso.findMany({ select: { id: true, titulo: true, status: true, quantidadeMeta: true, quantidadeArrecadada: true, unidade: true, Porto: { select: { nome: true } } }, orderBy: { criadoEm: "desc" } }),
    db.destino.findMany({ select: { id: true, razaoSocial: true, Usuario: { select: { ativo: true } }, _count: { select: { vagas: true, cursos: true } }, vagas: { select: { _count: { select: { contratacoes: true } } } } }, orderBy: { razaoSocial: "asc" } }),
    db.administrador.findMany({ select: { id: true, nome: true, login: true, ativo: true, aprovacaoPendente: true }, orderBy: { nome: "asc" } }),
    db.pagamentoPorto.groupBy({ by: ["portoId"], where: { status: "PAGO" }, _sum: { valorCentavos: true } }),
    db.pedido.groupBy({ by: ["destinoId"], where: { status: "PAGO" }, _sum: { totalCentavos: true } }),
    db.cursoNavegante.findMany({ where: { curso: { destinoId: { not: null } } }, distinct: ["naveganteId"], select: { naveganteId: true } }),
    db.navegante.count(),
    db.navegante.count({ where: { usuario: { ativo: true } } }),
    db.contratacao.count(),
    db.contratacao.count({ where: { encerradaEm: null } }),
    db.cursoRealizado.count(),
    db.apadrinhamento.count({ where: { cotas: { gt: 0 } } }),
    db.vaga.findMany({ where: { ativa: true }, select: { destino: { select: { cidade: true, uf: true } }, porto: { select: { cidade: true, uf: true } } } }),
  ]);
  const navegantes = usuarios.filter((u) => u.papel === "NAVEGANTE");
  const ativos = navegantes.filter((u) => u.ativo).length;
  const portosPendentes = portos.filter((p) => p.aprovacaoPendente);
  const media = (valores: (number | null)[]) => {
    const preenchidos = valores.filter((v): v is number => v !== null);
    return preenchidos.length ? formatarCentavos(Math.round(preenchidos.reduce((a, b) => a + b, 0) / preenchidos.length)) : "Não disponível";
  };
  const nomesPortos = new Map(portos.map((p) => [p.id, p.nome]));
  const nomesEmpresas = new Map(empresas.map((e) => [e.id, e.razaoSocial]));
  return <main className="conteudo admin">
    <h1>Administração NAVIRA</h1>
    <p className="subtitulo">Visão geral e gestão de acesso. Olá, {sessao.nome}.</p>
    <div className="admin-acoes"><Link className="botao secundario" href="/admin/senha">Alterar senha</Link><form action="/sair" method="post"><button className="botao secundario">Sair</button></form></div>
    {aviso && <p className="alerta sucesso" role="status">{aviso}</p>}

    <AbasPainelAdmin portos={portos} dados={{
      pessoasCadastradas, pessoasAtivas, vagasPublicadas: vagas.length,
      vagasAtivas: vagasComTerritorio.length, contratacoesRegistradas, contratacoesAtivas,
      cursosConcluidos, parceriasApadrinhamento, municipioDestaque: municipioComMaisVagas(vagasComTerritorio),
    }}>
    <section><h2>Visão geral</h2><div className="admin-indicadores">
      {[["Navegantes", navegantes.length], ["Portos", portos.length], ["Vagas", vagas.length], ["Cursos", cursos.length], ["Empresas", empresas.length], ["Aguardando aprovação", portosPendentes.length]].map(([nome, valor]) =>
        <div className="cartao admin-indicador" key={nome}><span>{nome}</span><strong>{valor}</strong></div>)}
    </div>
      <div className="admin-grade">
        <div className="cartao"><h3>Usuários navegantes</h3>{grafico([{ nome: "Ativos", quantidade: ativos }, { nome: "Desabilitados", quantidade: navegantes.length - ativos }])}</div>
        <div className="cartao"><h3>Portos</h3>{grafico([{ nome: "Aguardando aprovação", quantidade: portosPendentes.length }, { nome: "Habilitados", quantidade: portos.filter((p) => !p.aprovacaoPendente && ["ATIVO", "EM_ANALISE"].includes(p.status)).length }, { nome: "Suspensos ou inativos", quantidade: portos.filter((p) => !p.aprovacaoPendente && !["ATIVO", "EM_ANALISE"].includes(p.status)).length }])}</div>
        <div className="cartao"><h3>Vagas</h3>{grafico([{ nome: "Ativas", quantidade: vagas.filter((v) => v.ativa).length }, { nome: "Inativas", quantidade: vagas.filter((v) => !v.ativa).length }])}</div>
      </div>
      <div className="cartao"><h3>Remuneração informada nas vagas</h3><p>Média dos salários mínimos informados: <strong>{media(vagas.map((v) => v.salarioMinCentavos))}</strong>. Média dos salários máximos informados: <strong>{media(vagas.map((v) => v.salarioMaxCentavos))}</strong>. Cada média considera apenas vagas que preencheram o respectivo valor; não representa renda efetivamente recebida.</p></div>
    </section>

    <section><h2>Fila de aprovação</h2><div className="cartao">{portosPendentes.length === 0 ? <p>Nenhum Porto aguardando aprovação.</p> : <ul className="admin-lista">{portosPendentes.map((p) => <li key={p.id}><span><strong>{p.nome}</strong> · {[p.cidade, p.uf].filter(Boolean).join(" / ") || "localidade não informada"}</span>{controle(alterarPorto, p.id, "operacao", "aprovar", "Aprovar Porto")}</li>)}</ul>}</div></section>
    <section><h2>Portos e territórios</h2><div className="cartao"><p>Contagens de vínculos cadastrados, vagas e cursos por Porto. Clique na situação para habilitar ou desabilitar o Porto.</p><ul className="admin-lista">{portos.filter((p) => !p.aprovacaoPendente).map((p) => <LinhaPortoAdmin key={p.id} porto={p} />)}</ul></div></section>

    <section><h2>Empresas</h2><div className="cartao"><p>Com vagas: {empresas.filter((e) => e._count.vagas > 0).length} · Sem vagas: {empresas.filter((e) => !e._count.vagas).length} · Com cursos: {empresas.filter((e) => e._count.cursos > 0).length} · Sem cursos: {empresas.filter((e) => !e._count.cursos).length} · Com contratações registradas: {empresas.filter((e) => e.vagas.some((v) => v._count.contratacoes > 0)).length}.</p><p>Pessoas distintas inscritas em cursos cadastrados por empresas: {inscritosCursosEmpresa.length}. Inscrição não comprova conclusão.</p><ul className="admin-lista">{empresas.map((e) => <li key={e.id}><span><strong>{e.razaoSocial}</strong> · {e._count.vagas} vagas · {e._count.cursos} cursos · {e.vagas.reduce((n, v) => n + v._count.contratacoes, 0)} contratações · {e.Usuario.ativo ? "ativa" : "desabilitada"}</span></li>)}</ul></div></section>
    <section><h2>Contas de navegantes e empresas</h2><div className="cartao"><ul className="admin-lista">{usuarios.map((u) => <li key={u.id}><span><strong>{u.nome}</strong> · {u.papel === "DESTINO" ? "empresa" : "navegante"} · {u.ativo ? "ativa" : "desabilitada"}</span>{controle(alterarUsuario, u.id, "ativo", String(!u.ativo), u.ativo ? "Desabilitar" : "Habilitar")}</li>)}</ul><p className="ajuda">O acesso de empresas ainda não está disponível nesta versão.</p></div></section>
    <section><h2>Cursos, vagas e iniciativas</h2><div className="admin-grade">
      <div className="cartao"><h3>Cursos cadastrados</h3><ul>{cursos.map((c) => <li key={c.id}>{c.nome} · {c.porto?.nome ?? c.destino?.razaoSocial ?? "origem não informada"} · {c._count.navegantes} inscritos</li>)}</ul><p className="ajuda">Inscrições não indicam conclusão ou ganho obtido.</p></div>
      <div className="cartao"><h3>Vagas cadastradas</h3><ul>{vagas.map((v) => <li key={v.id}>{v.titulo} · {v.porto?.nome ?? v.destino?.razaoSocial ?? "origem não informada"} · {v.ativa ? "ativa" : "inativa"}</li>)}</ul></div>
      <div className="cartao"><h3>Iniciativas</h3><ul>{iniciativas.map((i) => <li key={i.id}>{i.titulo} · {i.Porto.nome} · {i.status}</li>)}</ul></div>
    </div></section>
    <section><h2>Pedidos de recursos</h2><div className="cartao"><ul>{recursos.map((r) => <li key={r.id}>{r.titulo} · {r.Porto.nome} · {r.status} · meta: {r.quantidadeMeta?.toString() ?? "não informada"} {r.unidade ?? ""} · arrecadado: {r.quantidadeArrecadada?.toString() ?? "não informado"}</li>)}</ul><p className="ajuda">Quantidades de unidades diferentes não são somadas.</p></div></section>
    <section><h2>Entradas registradas</h2><div className="admin-grade">
      <div className="cartao"><h3>Por Porto</h3><ul>{pagamentos.map((p) => <li key={p.portoId}>{nomesPortos.get(p.portoId) ?? "Porto não encontrado"}: {formatarCentavos(p._sum.valorCentavos ?? 0)}</li>)}</ul></div>
      <div className="cartao"><h3>Por empresa</h3><ul>{pedidos.map((p) => <li key={p.destinoId}>{nomesEmpresas.get(p.destinoId) ?? "Empresa não encontrada"}: {formatarCentavos(p._sum.totalCentavos ?? 0)}</li>)}</ul></div>
    </div><p className="ajuda">Somente registros com status pago; estes valores não representam salários ou conciliação bancária.</p></section>
    <section><h2>Indicadores em desenvolvimento</h2><div className="cartao"><p>Ganhos por curso e por empresa, inclusão, mobilidade, reputação, impacto territorial e recomendações comerciais: <strong>não disponíveis</strong>. Ainda não há dados ou metodologia suficientes para calculá-los com segurança.</p></div></section>
    <section><h2>Administradores</h2>
      <div className="cartao"><h3>Solicitações de cadastro</h3><p className="ajuda">Confirme a identidade da pessoa por um canal confiável antes de aprovar: o cadastro não verifica a posse do telefone ou e-mail.</p>
        {administradores.some((a) => a.aprovacaoPendente) ? <ul className="admin-lista">{administradores.filter((a) => a.aprovacaoPendente).map((a) => <li key={a.id}><span><strong>{a.nome}</strong> · {a.login} · aguardando aprovação</span><form action={aprovarAdministrador}><input type="hidden" name="id" value={a.id} /><button className="botao">Aprovar administrador</button></form></li>)}</ul> : <p>Nenhuma solicitação aguardando aprovação.</p>}
      </div>
      <div className="cartao"><ul className="admin-lista">{administradores.filter((a) => !a.aprovacaoPendente).map((a) => <li key={a.id}><span><strong>{a.nome}</strong> · {a.login} · {a.ativo ? "ativo" : "desabilitado"}</span>{a.id !== sessao.sub && controle(alterarAdministrador, a.id, "ativo", String(!a.ativo), a.ativo ? "Desabilitar" : "Habilitar")}</li>)}</ul></div>
      <form action={criarAdministrador} className="cartao formulario"><h3>Cadastrar administrador diretamente</h3>
        <div className="campo"><label htmlFor="nome-admin">Nome</label><input id="nome-admin" name="nome" required maxLength={120} /></div>
        <div className="campo"><label htmlFor="login-admin">Telefone ou e-mail</label><IdentificadorInput id="login-admin" name="login" required /></div>
        <div className="campo"><label htmlFor="senha-admin">Senha provisória</label><input id="senha-admin" name="senha" type="password" autoComplete="new-password" minLength={8} required /></div>
        <button className="botao">Cadastrar administrador</button>
      </form>
    </section>
    </AbasPainelAdmin>
  </main>;
}
