import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { formatarCentavos, formatarFaixaSalarial } from "@/lib/matching";
import { assinaturaAtiva, CATEGORIA_INICIATIVA_ROTULO, VALOR_COTA_APOIO_CENTAVOS } from "@/lib/porto-regras";
import FormVagaPorto from "./FormVagaPorto";
import FormCursoPorto from "./FormCursoPorto";
import FormIniciativaPorto from "./FormIniciativaPorto";
import FormularioRecolhivel from "./FormularioRecolhivel";
import BuscaBeneficiario from "./BuscaBeneficiario";
import FormEncerrarVinculo from "./FormEncerrarVinculo";
import { listarCandidatosPorto, visivelAoPorto } from "@/lib/contratacao-porto";
import {
  alternarApoioIniciativaPorto,
  alternarIniciativaPorto,
  alternarVagaPorto,
  comprarCotas,
  contratarCandidato,
  doarCotas,
  removerBeneficiario,
  removerCursoPorto,
  simularPagamento,
} from "./actions";

const AVISOS: Record<string, string> = {
  contratado: "Contratação registrada. Um crédito de contratação foi usado.",
  "sem-credito": "Sem crédito de contratação. Compre um crédito para contratar.",
  "vaga-indisponivel": "Esta vaga não está mais disponível para contratação.",
  "sem-candidato": "Esta pessoa não está na lista de candidatos da vaga.",
  "ja-contratado": "Esta pessoa já foi contratada para esta vaga.",
  "candidato-indisponivel": "Este candidato já foi escolhido por um porto. Nenhuma cota foi debitada.",
  "vinculo-encerrado": "Vínculo encerrado sem ressarcimento. O navegante está disponível para outros portos.",
  "cobranca-criada": "Cobrança criada. Os créditos serão liberados após a confirmação do pagamento.",
  transferido: "Créditos transferidos para o outro porto.",
  "quantidade-invalida": "Informe uma quantidade entre 1 e 100 vagas.",
  "porto-invalido": "Porto beneficiário não encontrado.",
  "transferencia-invalida": "Não foi possível transferir os créditos: confira o porto e a quantidade.",
  "remocao-beneficiario": "Não foi possível remover este porto: portos com vagas apoiadas permanecem no histórico.",
  erro: "Não foi possível concluir a contratação. Tente novamente.",
};

const ROTULO_PAGAMENTO: Record<string, string> = {
  ASSINATURA_ANUAL: "Assinatura anual",
  CREDITO_CONTRATACAO: "Crédito de contratação",
  COTA_APOIO: "Cotas de apoio",
};

const ROTULO_STATUS_PAGAMENTO: Record<string, string> = {
  PENDENTE: "aguardando pagamento",
  PAGO: "pago",
  CANCELADO: "cancelado",
  EXPIRADO: "expirado",
};

const MODALIDADE_ROTULO: Record<string, string> = { PRESENCIAL: "presencial", REMOTA: "online", HIBRIDA: "presencial e online" };

function nomeNavegante(n: { nomeSocial: string | null; usuario: { nome: string } }) {
  return (n.nomeSocial ?? n.usuario.nome).trim().split(/\s+/)[0];
}

export default async function PainelPorto({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const sessao = await exigirSessao("PORTO");
  const { aviso } = await searchParams;

  const porto = await db.porto.findUnique({ where: { usuarioId: sessao.sub } });
  if (!porto) redirect("/entrar");

  const agora = new Date();
  const ativa = assinaturaAtiva(porto, agora);
  const naoEhMeu = { OR: [{ portoId: null }, { portoId: { not: porto.id } }] };

  const [minhasVagas, regiaoVagas, meusCursos, regiaoCursos, minhasIniciativas, outrasIniciativas, apadrinhamentos, pagamentos, candidatos] = await Promise.all([
    db.vaga.findMany({
      where: { portoId: porto.id },
      include: {
        contratacoes: { where: { encerradaEm: null }, select: { naveganteId: true } },
      },
      orderBy: { criadaEm: "desc" },
    }),
    db.vaga.findMany({
      where: {
        ativa: true,
        AND: [
          { OR: [{ destino: { cidade: porto.cidade, uf: porto.uf } }, { porto: { cidade: porto.cidade, uf: porto.uf } }] },
          naoEhMeu,
        ],
      },
      include: { destino: { select: { razaoSocial: true } }, porto: { select: { nome: true } } },
      orderBy: { criadaEm: "desc" },
      take: 20,
    }),
    db.curso.findMany({
      where: { portoId: porto.id },
      include: {
        navegantes: { where: { navegante: visivelAoPorto(porto.id) }, select: { naveganteId: true, navegante: { select: { id: true, nomeSocial: true, usuario: { select: { nome: true } } } } } },
      },
      orderBy: { nome: "asc" },
    }),
    db.curso.findMany({
      where: {
        AND: [
          {
            OR: [
              { modalidade: "REMOTA" },
              { destino: { cidade: porto.cidade, uf: porto.uf } },
              { destino: { portos: { some: { portoId: porto.id } } } },
              { porto: { cidade: porto.cidade, uf: porto.uf } },
            ],
          },
          naoEhMeu,
        ],
      },
      take: 20,
    }),
    db.iniciativaPorto.findMany({
      where: { portoId: porto.id },
      include: {
        _count: { select: { ApoioIniciativa: true } },
        ApoioIniciativa: {
          where: { OR: [{ naveganteId: null }, { Navegante: visivelAoPorto(porto.id) }] },
          include: {
            Navegante: { select: { nomeSocial: true, usuario: { select: { nome: true } } } },
            Porto: { select: { nome: true } },
          },
        },
      },
      orderBy: { criadaEm: "desc" },
    }),
    db.iniciativaPorto.findMany({
      where: { status: "ABERTO", portoId: { not: porto.id } },
      include: {
        Porto: { select: { nome: true } },
        ApoioIniciativa: { where: { portoId: porto.id }, select: { id: true } },
      },
      orderBy: { criadaEm: "desc" },
      take: 30,
    }),
    db.apadrinhamento.findMany({
      where: { padrinhoId: porto.id },
      select: { cotas: true, afilhado: { select: { id: true, nome: true, tipo: true, cidade: true, uf: true, cep: true } } },
      orderBy: { afilhado: { nome: "asc" } },
    }),
    db.pagamentoPorto.findMany({
      where: { portoId: porto.id },
      include: { afilhado: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
      take: 20,
    }),
    listarCandidatosPorto(porto.id, agora),
  ]);

  return (
    <main className="conteudo">
      <header className="painel-cabecalho">
        <div>
          <h1>{porto.nome}</h1>
          <p className="subtitulo">
            {porto.tipo?.toLowerCase() ?? "porto"} · {porto.cidade ?? "—"}/{porto.uf ?? "—"} · CEP {porto.cep ?? "—"}
          </p>
        </div>
        <form action="/sair" method="post">
          <button className="botao botao-sair" type="submit">
            Sair
          </button>
        </form>
      </header>

      {aviso && AVISOS[aviso] && (
        <p className={`alerta ${["contratado", "cobranca-criada", "transferido", "vinculo-encerrado"].includes(aviso) ? "sucesso" : "erro"}`} role="status">{AVISOS[aviso]}</p>
      )}

      <section className="cartao" id="assinatura">
        <h2>Assinatura e contratação</h2>
        <p>
          {ativa
            ? <>Assinatura ativa até <strong>{porto.assinaturaAteEm?.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</strong>.</>
            : "Você não tem assinatura ativa."}{" "}
          Créditos de contratação disponíveis: <strong>{porto.creditosContratacao}</strong>.
        </p>
        <p className="ajuda">
          Cada vaga custa {formatarCentavos(VALOR_COTA_APOIO_CENTAVOS)} e gera um crédito de contratação para o porto beneficiário.
          A primeira compra do ano ativa a assinatura do pagador por um ano. Créditos disponíveis podem ser usados mesmo sem assinatura ativa.
        </p>
        <form action={comprarCotas} className="formulario-linha">
          <label htmlFor="vagas-proprias">Vagas para este porto</label>
          <input id="vagas-proprias" name="quantidade" type="number" min={1} max={100} defaultValue={1} required />
          <button className="botao" type="submit">Comprar vagas para meu porto</button>
        </form>
        <p className="ajuda">As cobranças pendentes aparecem abaixo. O pagamento é necessário para liberar os créditos.</p>
      </section>

      <section className="cartao" id="candidatos-do-porto">
        <h2>Candidatos às vagas do porto</h2>
        <p className="ajuda">Antes da escolha, somente o primeiro nome e os cursos concluídos são exibidos. Escolher um candidato custa uma cota e libera os contatos, sem ressarcimento caso a contratação não tenha sucesso.</p>
        <h3>Potenciais candidatos</h3>
        {candidatos.filter((c) => !c.vinculo && c.vagas.length > 0).length === 0 && <p className="vazio">Nenhum candidato disponível.</p>}
        <ul className="lista">
          {candidatos.filter((c) => !c.vinculo && c.vagas.length > 0).map((candidato) => (
            <li key={candidato.id}>
              <strong>{candidato.nome}</strong>
              {candidato.cursos.length ? (
                <ul>{candidato.cursos.map((curso, indice) => <li key={indice}>{curso.curso} · {curso.instituicao} · {curso.cargaHoraria}h</li>)}</ul>
              ) : <p className="ajuda">Nenhum curso concluído informado.</p>}
              {candidato.turnovers.map((turnover, indice) => (
                <p className="ajuda" key={indice}>Turnover: {turnover.dias} dia(s) · vínculo encerrado em {turnover.encerradaEm.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
              ))}
              {candidato.contatos && (
                <div>
                  <p>Nome completo: {candidato.contatos.nome}</p>
                  <p>Telefone: {candidato.contatos.telefone} · E-mail: {candidato.contatos.email ?? "não informado"}</p>
                  <p className="ajuda">Contatos disponíveis até uma nova contratação por outro porto.</p>
                </div>
              )}
              {candidato.vagas.map((vaga) => (
                <div className="acoes-porto" key={vaga.id}>
                  <span>{vaga.titulo}</span>
                  {vaga.ativa && porto.creditosContratacao > 0 ? (
                    <form action={contratarCandidato}>
                      <input type="hidden" name="vagaId" value={vaga.id} />
                      <input type="hidden" name="naveganteId" value={candidato.id} />
                      <button className="botao" type="submit">Escolher candidato (1 cota)</button>
                    </form>
                  ) : <span className="ajuda">{vaga.ativa ? "sem cota disponível" : "vaga pausada; candidatura mantida"}</span>}
                </div>
              ))}
            </li>
          ))}
        </ul>
        <h3>Candidatos escolhidos</h3>
        {candidatos.filter((c) => c.vinculo).length === 0 && <p className="vazio">Nenhum vínculo ativo.</p>}
        <ul className="lista">
          {candidatos.filter((c) => c.vinculo).map((candidato) => (
            <li key={candidato.id}>
              <strong>{candidato.contatos?.nome ?? candidato.nome}</strong>
              <p>Vaga: {candidato.vinculo!.vaga}</p>
              {candidato.contatos && <p>Telefone: {candidato.contatos.telefone} · E-mail: {candidato.contatos.email ?? "não informado"}</p>}
              <ul>{candidato.cursos.map((curso, indice) => <li key={indice}>{curso.curso} · {curso.instituicao} · {curso.cargaHoraria}h</li>)}</ul>
              <FormularioRecolhivel rotulo="Informar não sucesso na contratação">
                <FormEncerrarVinculo contratacaoId={candidato.vinculo!.id} />
              </FormularioRecolhivel>
            </li>
          ))}
        </ul>
        {candidatos.some((c) => !c.vinculo && c.vagas.length === 0 && c.contatos) && (
          <div>
            <h3>Contatos de vínculos encerrados</h3>
            <p className="ajuda">Estes navegantes não estão na lista de potenciais candidatos. Os contatos permanecem disponíveis até uma nova contratação por outro porto.</p>
            {candidatos.filter((c) => !c.vinculo && c.vagas.length === 0 && c.contatos).map((c) => (
              <p key={c.id}>{c.contatos!.nome} · {c.contatos!.telefone} · {c.contatos!.email ?? "e-mail não informado"}</p>
            ))}
          </div>
        )}
      </section>

      <section className="cartao" id="vagas-do-porto">
        <h2>Vagas do porto</h2>
        <p className="ajuda">Publique as vagas de acordo com as necessidades do porto. Quem se candidata entra na lista de candidatos.</p>
        <h3>Vagas publicadas</h3>
        {minhasVagas.length === 0 ? (
          <p className="vazio">Nenhuma vaga publicada.</p>
        ) : (
          <ul className="lista">
            {minhasVagas.map((vaga) => {
              const contratados = new Set(vaga.contratacoes.map((c) => c.naveganteId));
              return (
                <li key={vaga.id}>
                  <strong>{vaga.titulo}</strong>{" "}
                  <span className="tag">{vaga.ativa ? "ativa" : "pausada"}</span>
                  <div className="ajuda">
                    {formatarFaixaSalarial(vaga.salarioMinCentavos, vaga.salarioMaxCentavos) ?? "salário a combinar"}
                    {" · "}{contratados.size}/{vaga.quantidade} contratado(s)
                  </div>
                  <p className="descricao-vaga">{vaga.descricao}</p>
                  <form action={alternarVagaPorto}>
                    <input type="hidden" name="vagaId" value={vaga.id} />
                    <button className="botao secundario" type="submit">{vaga.ativa ? "Pausar vaga" : "Reativar vaga"}</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <h3>Vagas na sua região</h3>
        {regiaoVagas.length === 0 ? (
          <p className="vazio">
            Nenhuma vaga ativa em {porto.cidade}/{porto.uf}.
          </p>
        ) : (
          <ul className="lista">
            {regiaoVagas.map((v) => (
              <li key={v.id}>
                <strong>{v.titulo}</strong>
                <div className="ajuda">{[v.destino?.razaoSocial ?? v.porto?.nome, formatarFaixaSalarial(v.salarioMinCentavos, v.salarioMaxCentavos)].filter(Boolean).join(" · ")}</div>
              </li>
            ))}
          </ul>
        )}
        <FormularioRecolhivel rotulo="Publicar vaga"><FormVagaPorto /></FormularioRecolhivel>
      </section>

      <section className="cartao" id="cursos-do-porto">
        <h2>Cursos do porto</h2>
        <p className="ajuda">Cadastre os cursos do porto. Quem escolhe um curso entra na lista dele.</p>
        <h3>Cursos cadastrados</h3>
        {meusCursos.length === 0 ? (
          <p className="vazio">Nenhum curso cadastrado.</p>
        ) : (
          <ul className="lista">
            {meusCursos.map((curso) => (
              <li key={curso.id}>
                <strong>{curso.nome}</strong>
                <span className="ajuda">
                  {" "}· {curso.cargaHorariaHoras}h · {MODALIDADE_ROTULO[curso.modalidade] ?? curso.modalidade.toLowerCase()}
                  {curso.instituicaoEnsino ? ` · ${curso.instituicaoEnsino}` : ""}
                </span>
                <form action={removerCursoPorto} className="form-remover-porto">
                  <input type="hidden" name="cursoId" value={curso.id} />
                  <button className="botao secundario" type="submit">Remover</button>
                </form>
                <h4>Lista de interessados ({curso.navegantes.length})</h4>
                {curso.navegantes.length === 0 ? (
                  <p className="vazio">Ninguém escolheu este curso ainda.</p>
                ) : (
                  <ul className="lista">
                    {curso.navegantes.map(({ navegante }) => (
                      <li key={navegante.id}>{nomeNavegante(navegante)}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        <h3>Cursos na sua região</h3>
        {regiaoCursos.length === 0 ? (
          <p className="vazio">Nenhum curso disponível para este território.</p>
        ) : (
          <ul className="lista">
            {regiaoCursos.map((c) => (
              <li key={c.id}>
                <strong>{c.nome}</strong>
                <span className="ajuda">
                  {" "}· {c.modalidade.toLowerCase()}
                  {c.instituicaoEnsino ? ` · ${c.instituicaoEnsino}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <FormularioRecolhivel rotulo="Cadastrar curso"><FormCursoPorto /></FormularioRecolhivel>
      </section>

      <section className="cartao" id="iniciativas-do-porto">
        <h2>Iniciativas do porto</h2>
        <p className="ajuda">Cadastre as iniciativas do porto. Quem apoia entra na lista de potenciais apoiadores.</p>
        <h3>Iniciativas cadastradas</h3>
        {minhasIniciativas.length === 0 ? (
          <p className="vazio">Nenhuma iniciativa cadastrada.</p>
        ) : (
          <ul className="lista">
            {minhasIniciativas.map((iniciativa) => (
              <li key={iniciativa.id}>
                <strong>{iniciativa.titulo}</strong>{" "}
                <span className="tag">{CATEGORIA_INICIATIVA_ROTULO[iniciativa.categoria]}</span>{" "}
                <span className="tag">{iniciativa.status === "ABERTO" ? "aberta" : iniciativa.status.toLowerCase()}</span>
                <div className="ajuda">
                  {MODALIDADE_ROTULO[iniciativa.modalidade] ?? iniciativa.modalidade.toLowerCase()}
                  {iniciativa.vagasTotais ? ` · ${iniciativa.vagasTotais} vagas` : ""}
                </div>
                <p className="descricao-vaga">{iniciativa.descricao}</p>
                <form action={alternarIniciativaPorto}>
                  <input type="hidden" name="iniciativaId" value={iniciativa.id} />
                  <button className="botao secundario" type="submit">
                    {iniciativa.status === "ENCERRADO" ? "Reabrir" : "Encerrar"}
                  </button>
                </form>
                <h4>Potenciais apoiadores ({iniciativa._count.ApoioIniciativa})</h4>
                {iniciativa.ApoioIniciativa.length === 0 ? (
                  <p className="vazio">Ainda não há apoiadores.</p>
                ) : (
                  <ul className="lista">
                    {iniciativa.ApoioIniciativa.map((apoio) => (
                      <li key={apoio.id}>
                        {apoio.Navegante ? nomeNavegante(apoio.Navegante) : apoio.Porto?.nome}
                        <span className="ajuda"> · {apoio.Navegante ? "navegante" : "porto"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        <h3>Iniciativas de outros portos</h3>
        {outrasIniciativas.length === 0 ? (
          <p className="vazio">Nenhuma iniciativa aberta de outros portos.</p>
        ) : (
          <ul className="lista">
            {outrasIniciativas.map((iniciativa) => {
              const apoiada = iniciativa.ApoioIniciativa.length > 0;
              return (
                <li key={iniciativa.id}>
                  <div className="iniciativa-cabecalho">
                    <strong>{iniciativa.titulo}</strong>
                    <form action={alternarApoioIniciativaPorto}>
                      <input type="hidden" name="iniciativaId" value={iniciativa.id} />
                      <button className={apoiada ? "botao secundario" : "botao"} type="submit">
                        {apoiada ? "Deixar de apoiar" : "Apoiar iniciativa"}
                      </button>
                    </form>
                    <span className="tag">{CATEGORIA_INICIATIVA_ROTULO[iniciativa.categoria]}</span>
                  </div>
                  <div className="ajuda">{iniciativa.Porto.nome} · {MODALIDADE_ROTULO[iniciativa.modalidade] ?? iniciativa.modalidade.toLowerCase()}</div>
                </li>
              );
            })}
          </ul>
        )}
        <FormularioRecolhivel rotulo="Cadastrar iniciativa"><FormIniciativaPorto /></FormularioRecolhivel>
      </section>

      <section className="cartao" id="outros-portos">
        <h2>Apadrinhar outros portos</h2>
        <p className="ajuda">Compre vagas para outro porto ou doe créditos disponíveis. Cada vaga paga ou crédito transferido beneficia o porto escolhido.</p>
        <BuscaBeneficiario selecionados={apadrinhamentos.map(({ afilhado }) => afilhado.id)} />
        <h3>Portos a beneficiar</h3>
        {apadrinhamentos.length === 0 ? (
          <p className="vazio">Nenhum porto adicionado à lista.</p>
        ) : (
          <ul className="lista">
            {apadrinhamentos.map(({ afilhado: p, cotas }) => {
              return (
                <li key={p.id}>
                  <strong>{p.nome}</strong>{" "}
                  <span className="ajuda">
                    · {p.tipo?.toLowerCase() ?? "porto"} · {[p.cidade, p.uf].filter(Boolean).join("/")} · CEP {p.cep ?? "—"}
                  </span>
                  {cotas > 0 ? (
                    <div><span className="tag">Apadrinhado · {cotas} vaga(s) apoiada(s)</span></div>
                  ) : (
                    <div>
                      <span className="tag">Selecionado · ainda não beneficiado</span>
                      <form action={removerBeneficiario} className="form-remover-porto">
                        <input type="hidden" name="afilhadoId" value={p.id} />
                        <button className="botao secundario" type="submit">Remover da lista</button>
                      </form>
                    </div>
                  )}
                  <form action={comprarCotas} className="formulario-linha">
                    <input type="hidden" name="afilhadoId" value={p.id} />
                    <label htmlFor={`cotas-${p.id}`}>Vagas para {p.nome}</label>
                    <input id={`cotas-${p.id}`} name="quantidade" type="number" min={1} max={100} defaultValue={1} required />
                    <button className="botao" type="submit">Comprar vagas para este porto</button>
                  </form>
                  <form action={doarCotas} className="formulario-linha">
                    <input type="hidden" name="afilhadoId" value={p.id} />
                    <label htmlFor={`doacao-${p.id}`}>Créditos para doar a {p.nome}</label>
                    <input id={`doacao-${p.id}`} name="quantidade" type="number" min={1} max={100} defaultValue={1} required />
                    <button className="botao secundario" type="submit">Doar créditos existentes</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cartao" id="pagamentos">
        <h2>Cobranças</h2>
        {pagamentos.length === 0 ? (
          <p className="vazio">Nenhuma cobrança gerada.</p>
        ) : (
          <ul className="lista">
            {pagamentos.map((pagamento) => (
              <li key={pagamento.id}>
                <strong>{ROTULO_PAGAMENTO[pagamento.tipo]}</strong>
                {pagamento.tipo === "COTA_APOIO" && pagamento.afilhado ? ` · ${pagamento.quantidade} cota(s) para ${pagamento.afilhado.nome}` : ""}
                {pagamento.tipo === "CREDITO_CONTRATACAO" && pagamento.quantidade > 1 ? ` · ${pagamento.quantidade}` : ""}
                <span className="ajuda"> · {formatarCentavos(pagamento.valorCentavos)} · {ROTULO_STATUS_PAGAMENTO[pagamento.status] ?? pagamento.status.toLowerCase()}</span>
                {pagamento.status === "PENDENTE" && process.env.NODE_ENV !== "production" && (
                  <form action={simularPagamento} className="form-remover-porto">
                    <input type="hidden" name="pagamentoId" value={pagamento.id} />
                    <button className="botao secundario" type="submit">Simular pagamento (testes)</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
