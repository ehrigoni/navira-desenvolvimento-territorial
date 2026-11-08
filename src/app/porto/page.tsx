import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { formatarCentavos, formatarFaixaSalarial } from "@/lib/matching";
import { assinaturaAtiva, CATEGORIA_INICIATIVA_ROTULO, VALOR_ASSINATURA_ANUAL_CENTAVOS, VALOR_COTA_APOIO_CENTAVOS, VALOR_CREDITO_CONTRATACAO_CENTAVOS } from "@/lib/porto-regras";
import FormVagaPorto from "./FormVagaPorto";
import FormCursoPorto from "./FormCursoPorto";
import FormIniciativaPorto from "./FormIniciativaPorto";
import {
  alternarApoioIniciativaPorto,
  alternarIniciativaPorto,
  alternarVagaPorto,
  apadrinhar,
  comprarCotas,
  contratarCandidato,
  criarCobrancaPorto,
  desapadrinhar,
  removerCursoPorto,
  simularPagamento,
} from "./actions";

const AVISOS: Record<string, string> = {
  contratado: "Contratação registrada. Um crédito de contratação foi usado.",
  "sem-credito": "Sem crédito de contratação. Compre um crédito para contratar.",
  "assinatura-vencida": "Sua assinatura venceu. Renove para contratar.",
  "vaga-indisponivel": "Esta vaga não está mais disponível para contratação.",
  "sem-candidato": "Esta pessoa não está na lista de candidatos da vaga.",
  "ja-contratado": "Esta pessoa já foi contratada para esta vaga.",
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
  return n.nomeSocial ?? n.usuario.nome;
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

  const [minhasVagas, regiaoVagas, meusCursos, regiaoCursos, minhasIniciativas, outrasIniciativas, outrosPortos, apadrinhamentos, pagamentos] = await Promise.all([
    db.vaga.findMany({
      where: { portoId: porto.id },
      include: {
        navegantes: { select: { naveganteId: true, navegante: { select: { id: true, nomeSocial: true, usuario: { select: { nome: true } } } } } },
        contratacoes: { select: { naveganteId: true } },
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
        navegantes: { select: { naveganteId: true, navegante: { select: { id: true, nomeSocial: true, usuario: { select: { nome: true } } } } } },
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
    db.porto.findMany({
      where: { cidade: porto.cidade, uf: porto.uf, NOT: { id: porto.id } },
      orderBy: { nome: "asc" },
      take: 50,
    }),
    db.apadrinhamento.findMany({ where: { padrinhoId: porto.id }, select: { afilhadoId: true, cotas: true } }),
    db.pagamentoPorto.findMany({
      where: { portoId: porto.id },
      include: { afilhado: { select: { nome: true } } },
      orderBy: { criadoEm: "desc" },
      take: 20,
    }),
  ]);

  const apadrinhadosPorId = new Map(apadrinhamentos.map((a) => [a.afilhadoId, a.cotas]));

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
          <button className="botao secundario" type="submit">
            Sair
          </button>
        </form>
      </header>

      {aviso && AVISOS[aviso] && (
        <p className={`alerta ${aviso === "contratado" ? "sucesso" : "erro"}`} role="status">{AVISOS[aviso]}</p>
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
          A assinatura anual de {formatarCentavos(VALOR_ASSINATURA_ANUAL_CENTAVOS)} dá direito a contratar um empregado.
          Cada empregado contratado pela plataforma custa {formatarCentavos(VALOR_CREDITO_CONTRATACAO_CENTAVOS)}.
        </p>
        <div className="acoes-porto">
          <form action={criarCobrancaPorto}>
            <input type="hidden" name="tipo" value="ASSINATURA_ANUAL" />
            <button className="botao" type="submit">Gerar cobrança da assinatura anual</button>
          </form>
          <form action={criarCobrancaPorto}>
            <input type="hidden" name="tipo" value="CREDITO_CONTRATACAO" />
            <button className="botao secundario" type="submit">Comprar crédito de contratação</button>
          </form>
        </div>
      </section>

      <section className="cartao" id="vagas-do-porto">
        <h2>Vagas do porto</h2>
        <p className="ajuda">Publique as vagas de acordo com as necessidades do porto. Quem se candidata entra na lista de candidatos.</p>
        <FormVagaPorto />
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
                  <h4>Candidatos ({vaga.navegantes.length})</h4>
                  {vaga.navegantes.length === 0 ? (
                    <p className="vazio">Ainda não há candidatos.</p>
                  ) : (
                    <ul className="lista">
                      {vaga.navegantes.map(({ navegante }) => {
                        const jaContratado = contratados.has(navegante.id);
                        return (
                          <li key={navegante.id}>
                            {nomeNavegante(navegante)}{" "}
                            {jaContratado ? (
                              <span className="tag">contratado</span>
                            ) : vaga.ativa && ativa && porto.creditosContratacao > 0 ? (
                              <form action={contratarCandidato} className="form-remover-porto">
                                <input type="hidden" name="vagaId" value={vaga.id} />
                                <input type="hidden" name="naveganteId" value={navegante.id} />
                                <button className="botao" type="submit">Contratar</button>
                              </form>
                            ) : (
                              <span className="ajuda">
                                {!vaga.ativa ? "vaga pausada" : !ativa ? "assinatura vencida" : "sem crédito de contratação"}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
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
      </section>

      <section className="cartao" id="cursos-do-porto">
        <h2>Cursos do porto</h2>
        <p className="ajuda">Cadastre os cursos do porto. Quem escolhe um curso entra na lista dele.</p>
        <FormCursoPorto />
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
      </section>

      <section className="cartao" id="iniciativas-do-porto">
        <h2>Iniciativas do porto</h2>
        <p className="ajuda">Cadastre as iniciativas do porto. Quem apoia entra na lista de potenciais apoiadores.</p>
        <FormIniciativaPorto />
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
                  <strong>{iniciativa.titulo}</strong>{" "}
                  <span className="tag">{CATEGORIA_INICIATIVA_ROTULO[iniciativa.categoria]}</span>
                  <div className="ajuda">{iniciativa.Porto.nome} · {MODALIDADE_ROTULO[iniciativa.modalidade] ?? iniciativa.modalidade.toLowerCase()}</div>
                  <form action={alternarApoioIniciativaPorto}>
                    <input type="hidden" name="iniciativaId" value={iniciativa.id} />
                    <button className={apoiada ? "botao secundario" : "botao"} type="submit">
                      {apoiada ? "Deixar de apoiar" : "Apoiar iniciativa"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cartao" id="outros-portos">
        <h2>Outros portos da região</h2>
        <p className="ajuda">Apadrinhe outros portos. Para apoiá-los com recursos, compre cotas de apoio.</p>
        {outrosPortos.length === 0 ? (
          <p className="vazio">
            Ainda não há outros portos em {porto.cidade}/{porto.uf}.
          </p>
        ) : (
          <ul className="lista">
            {outrosPortos.map((p) => {
              const cotas = apadrinhadosPorId.get(p.id);
              const apadrinhado = cotas !== undefined;
              return (
                <li key={p.id}>
                  <strong>{p.nome}</strong>{" "}
                  <span className="ajuda">
                    · {p.tipo?.toLowerCase() ?? "porto"} · CEP {p.cep ?? "—"}
                  </span>
                  {apadrinhado ? (
                    <div>
                      <span className="tag">Apadrinhado · {cotas} cota(s)</span>
                      {cotas === 0 && (
                        <form action={desapadrinhar} className="form-remover-porto">
                          <input type="hidden" name="afilhadoId" value={p.id} />
                          <button className="botao secundario" type="submit">Deixar de apadrinhar</button>
                        </form>
                      )}
                      <form action={comprarCotas} className="formulario-linha">
                        <input type="hidden" name="afilhadoId" value={p.id} />
                        <label htmlFor={`cotas-${p.id}`} className="ajuda">Cotas</label>
                        <input id={`cotas-${p.id}`} name="quantidade" type="number" min={1} max={100} defaultValue={1} />
                        <button className="botao" type="submit">
                          Comprar cotas ({formatarCentavos(VALOR_COTA_APOIO_CENTAVOS)} cada)
                        </button>
                      </form>
                    </div>
                  ) : (
                    <form action={apadrinhar}>
                      <input type="hidden" name="afilhadoId" value={p.id} />
                      <button className="botao secundario" type="submit">Apadrinhar</button>
                    </form>
                  )}
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
