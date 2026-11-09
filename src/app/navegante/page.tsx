import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { calcularIndiceLocal, formatarFaixaSalarial } from "@/lib/matching";
import { CATEGORIA_INICIATIVA_ROTULO } from "@/lib/porto-regras";
import { detalhesVaga } from "@/lib/dados-porto";
import { incluirMetasColaboracao } from "@/lib/consulta-colaboracoes";
import MetasColaboracao from "../colaboracoes/MetasColaboracao";
import IniciativaRecolhivel from "../colaboracoes/IniciativaRecolhivel";
import BuscaPorto from "./BuscaPorto";
import BuscaEscolha from "./BuscaEscolha";
import FormularioCursoRealizado from "./FormularioCursoRealizado";
import {
  deixarApoioIniciativaNavegante,
  buscarCursos,
  buscarVagas,
  escolherCurso,
  escolherVaga,
  removerCursoEscolhido,
  removerCursoRealizado,
  removerPorto,
  removerVagaEscolhida,
  retirarCandidaturasPorto,
  type ItemBusca,
} from "./actions";

const MODALIDADE_ROTULO: Record<string, string> = { PRESENCIAL: "presencial", REMOTA: "online", HIBRIDA: "presencial e online" };

export default async function PainelNavegante({
  searchParams,
}: {
  searchParams: Promise<{ vagas?: string; cursos?: string; incluir?: string; aviso?: string }>;
}) {
  const sessao = await exigirSessao("NAVEGANTE");
  const { vagas: verVagas, cursos: verCursos, incluir, aviso } = await searchParams;

  const navegante = await db.navegante.findUnique({
    where: { usuarioId: sessao.sub },
    include: {
      portos: { include: { porto: true } },
      CursoRealizado: { orderBy: { dataRealizacao: "desc" } },
      vagas: { select: { vagaId: true, vaga: { include: { destino: { select: { razaoSocial: true } }, porto: { select: { id: true, nome: true } }, cursos: { include: { curso: { select: { nome: true } } } } } } } },
      Contratacao: { where: { encerradaEm: null }, select: { Porto: { select: { nome: true } } } },
      cursos: { select: { cursoId: true } },
    },
  });
  if (!navegante) redirect("/entrar");
  if (!navegante.ethosConcluidoEm) redirect("/navegante/ethos");

  const portos = navegante.portos.map((i) => i.porto);
  const escolhidasVagas = new Set(navegante.vagas.map((v) => v.vagaId));
  const escolhidosCursos = new Set(navegante.cursos.map((c) => c.cursoId));

  // Vagas recomendadas: próximas dos portos; "todas" mostra todas as ativas.
  const vagasAtivas = await db.vaga.findMany({
    where: { ativa: true },
    include: {
      destino: { select: { razaoSocial: true, cnae: true, cep: true, cidade: true, uf: true } },
      porto: { select: { nome: true, cep: true, cidade: true, uf: true } },
      cursos: { include: { curso: { select: { id: true, nome: true } } } },
    },
    orderBy: { criadaEm: "desc" },
    take: 200,
  });
  const vagasRankeadas = vagasAtivas
    .map((vaga) => ({
      vaga,
      indice: calcularIndiceLocal(
        {
          cep: vaga.cep ?? vaga.destino?.cep ?? vaga.porto?.cep,
          cidade: vaga.destino?.cidade ?? vaga.porto?.cidade,
          uf: vaga.destino?.uf ?? vaga.porto?.uf,
        },
        portos,
      ),
    }))
    .sort((a, b) => b.indice - a.indice);
  const mostrarTodasVagas = verVagas === "todas";
  const vagas = (mostrarTodasVagas ? vagasRankeadas : vagasRankeadas.filter((v) => v.indice > 0)).slice(0, mostrarTodasVagas ? 100 : 20);
  const recomendadasVagas: ItemBusca[] = vagas.map(({ vaga, indice }) => ({
    id: vaga.id,
    titulo: vaga.titulo,
    detalhe: [
      vaga.destino?.razaoSocial ?? vaga.porto?.nome,
      (vaga.destino?.cidade ?? vaga.porto?.cidade) && (vaga.destino?.uf ?? vaga.porto?.uf)
        ? `${vaga.destino?.cidade ?? vaga.porto?.cidade}/${vaga.destino?.uf ?? vaga.porto?.uf}`
        : null,
      formatarFaixaSalarial(vaga.salarioMinCentavos, vaga.salarioMaxCentavos),
      vaga.cursos.length > 0 ? `Cursos exigidos: ${vaga.cursos.map((c) => c.curso.nome).join(", ")}` : null,
      detalhesVaga(vaga.requisitos).requisitos ? `Requisitos: ${detalhesVaga(vaga.requisitos).requisitos}` : null,
      detalhesVaga(vaga.requisitos).expectativas ? `Expectativas: ${detalhesVaga(vaga.requisitos).expectativas}` : null,
      vaga.beneficios.length ? `Benefícios: ${vaga.beneficios.join(", ")}` : null,
    ].filter(Boolean).join(" · "),
    escolhido: escolhidasVagas.has(vaga.id),
    indice,
  }));
  const vagasEscolhidas = navegante.vagas.map((v) => v.vaga);
  const vinculoAtivo = navegante.Contratacao[0];

  // Cursos recomendados: próximos dos portos; "todos" mostra todos.
  const cursosDisponiveis = await db.curso.findMany({
    include: {
      destino: { select: { cep: true, cidade: true, uf: true } },
      porto: { select: { cep: true, cidade: true, uf: true } },
    },
    orderBy: { nome: "asc" },
    take: 200,
  });
  const cursosRankeados = cursosDisponiveis
    .map((curso) => ({
      curso,
      indice: calcularIndiceLocal(
        {
          cep: curso.cep ?? curso.destino?.cep ?? curso.porto?.cep,
          cidade: curso.destino?.cidade ?? curso.porto?.cidade,
          uf: curso.destino?.uf ?? curso.porto?.uf,
        },
        portos,
      ),
    }))
    .sort((a, b) => b.indice - a.indice);
  const mostrarTodosCursos = verCursos === "todos";
  const cursos = (mostrarTodosCursos ? cursosRankeados : cursosRankeados.filter((c) => c.indice > 0)).slice(0, mostrarTodosCursos ? 100 : 20);
  const recomendadosCursos: ItemBusca[] = cursos.map(({ curso, indice }) => ({
    id: curso.id,
    titulo: curso.nome,
    detalhe: [
      `${curso.cargaHorariaHoras}h`,
      MODALIDADE_ROTULO[curso.modalidade] ?? curso.modalidade.toLowerCase(),
      curso.instituicaoEnsino,
      curso.inicio ? `Início: ${curso.inicio.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : null,
      curso.termino ? `Término: ${curso.termino.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : null,
      curso.vagasDisponiveis !== null ? `${curso.vagasDisponiveis} vaga(s)` : null,
    ].filter(Boolean).join(" · "),
    escolhido: escolhidosCursos.has(curso.id),
    indice,
  }));
  const cursosEscolhidos = cursosDisponiveis.filter((c) => escolhidosCursos.has(c.id));

  const iniciativas = portos.length === 0 ? [] : await db.iniciativaPorto.findMany({
    where: { status: "ABERTO", portoId: { in: portos.map((p) => p.id) } },
    include: {
      metasColaboracao: incluirMetasColaboracao(),
      Porto: { select: { nome: true } },
      _count: { select: { ApoioIniciativa: true } },
      ApoioIniciativa: { where: { naveganteId: navegante.id }, select: { id: true } },
    },
    orderBy: { criadaEm: "desc" },
    take: 50,
  });

  const mostrarFormularioCurso = incluir === "curso";

  return (
    <main className="conteudo">
      <header className="painel-cabecalho">
        <div>
          <h1>Meus Portos</h1>
          <p className="subtitulo">Olá, {sessao.nome.split(" ")[0]}. Seu painel de portos, vagas e cursos.</p>
        </div>
      </header>

      {aviso === "vinculo-ativo" && <p className="alerta erro" role="alert">Você possui vínculo ativo com um porto e não pode alterar suas candidaturas.</p>}
      {aviso === "vaga-invalida" && <p className="alerta erro" role="alert">Esta vaga não está disponível para candidatura.</p>}
      {aviso === "porto-invalido" && <p className="alerta erro" role="alert">Porto inválido para retirada da candidatura.</p>}
      {vinculoAtivo && <p className="alerta sucesso" role="status">Você foi escolhido por {vinculoAtivo.Porto.nome}. Suas demais candidaturas estão ocultas e não podem ser retiradas enquanto o vínculo estiver ativo.</p>}

      <div className="acao-editar-ethos">
        <Link className="botao" href="/navegante/ethos">Editar Ethos</Link>
      </div>

      <section className="cartao painel-portos">
        <h2>Meus portos</h2>
        {portos.length === 0 ? (
          <p className="vazio">Você ainda não está inscrito em nenhum porto.</p>
        ) : (
          <ul className="lista">
            {navegante.portos.map(({ porto }) => (
              <li key={porto.id}>
                <strong>{porto.nome}</strong>{" "}
                <form action={removerPorto} className="form-remover-porto">
                  <input type="hidden" name="portoId" value={porto.id} />
                  <button className="botao-x" type="submit" aria-label={`Remover ${porto.nome}`} title="Remover porto">×</button>
                </form>
                <br />
                <span className="ajuda">
                  · {[porto.logradouro, porto.numero, porto.bairro].filter(Boolean).join(", ") || "endereço não informado"}
                  {" · "}{porto.cidade ?? "—"}/{porto.uf ?? "—"} · CEP {porto.cep ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <h3>Adicionar porto</h3>
        <BuscaPorto />
        <section id="iniciativas">
          <h3>Iniciativas dos meus portos</h3>
          <p className="ajuda">Abra uma iniciativa para consultar suas necessidades e colaborar.</p>
          {iniciativas.length === 0 ? (
            <p className="vazio">Nenhuma iniciativa aberta nos seus portos.</p>
          ) : (
            <ul className="lista">
              {iniciativas.map((iniciativa) => {
                const apoiada = iniciativa.ApoioIniciativa.length > 0;
                return (
                  <li key={iniciativa.id}>
                    <IniciativaRecolhivel titulo={iniciativa.titulo} categoria={CATEGORIA_INICIATIVA_ROTULO[iniciativa.categoria]}>
                      <div className="ajuda">
                        {iniciativa.Porto.nome} · {MODALIDADE_ROTULO[iniciativa.modalidade] ?? iniciativa.modalidade.toLowerCase()}
                        {" · "}{iniciativa._count.ApoioIniciativa} apoiador(es)
                      </div>
                      <p className="descricao-vaga">{iniciativa.descricao}</p>
                      <MetasColaboracao metas={iniciativa.metasColaboracao} iniciativaId={iniciativa.id} apoiadorId={navegante.id} papel="NAVEGANTE" />
                      {apoiada && <form action={deixarApoioIniciativaNavegante}>
                        <input type="hidden" name="iniciativaId" value={iniciativa.id} />
                        <button className="botao secundario" type="submit">Deixar de apoiar</button>
                      </form>}
                    </IniciativaRecolhivel>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>

      <section className="cartao painel-vagas">
        <h2>{mostrarTodasVagas ? "Todas as vagas" : "Minhas vagas"}</h2>
        <p className="ajuda">
          {mostrarTodasVagas
            ? "Todas as vagas ativas, da mais próxima dos seus portos para a menos próxima."
            : "Vagas mais próximas dos seus portos, da mais para a menos compatível."}
        </p>
        <p>
          {mostrarTodasVagas ? (
            <Link href="/navegante">Ver só minhas vagas</Link>
          ) : (
            <Link href="/navegante?vagas=todas">Ver todas as vagas</Link>
          )}
        </p>
        {!vinculoAtivo && <BuscaEscolha
          id="busca-vaga"
          rotulo="Buscar vaga"
          placeholder="Digite o cargo ou a empresa"
          ajuda="Use as setas para escolher e Enter para marcar a vaga."
          recomendados={recomendadasVagas}
          buscar={buscarVagas}
          escolher={escolherVaga}
          campo="vagaId"
          vazio="Nenhuma vaga próxima dos seus portos no momento."
        />}
        <h3>Vagas escolhidas</h3>
        {vagasEscolhidas.length === 0 ? (
          <p className="vazio">Você ainda não escolheu vagas.</p>
        ) : (
          <ul className="lista">
            {vagasEscolhidas.map((vaga) => (
              <li key={vaga.id}>
                <strong>{vaga.titulo}</strong>{" "}
                {!vinculoAtivo && <form action={removerVagaEscolhida} className="form-remover-porto">
                  <input type="hidden" name="vagaId" value={vaga.id} />
                  <button className="botao-x" type="submit" aria-label={`Remover ${vaga.titulo}`} title="Remover vaga">×</button>
                </form>}
                {!vaga.ativa && <span className="tag">Vaga pausada · candidatura mantida</span>}
                <div className="ajuda">{vaga.destino?.razaoSocial ?? vaga.porto?.nome}</div>
                <p className="descricao-vaga">{vaga.descricao}</p>
                {detalhesVaga(vaga.requisitos).requisitos && <p className="descricao-vaga"><strong>Requisitos:</strong> {detalhesVaga(vaga.requisitos).requisitos}</p>}
                {detalhesVaga(vaga.requisitos).expectativas && <p className="descricao-vaga"><strong>Expectativas:</strong> {detalhesVaga(vaga.requisitos).expectativas}</p>}
                {vaga.beneficios.length > 0 && <p className="descricao-vaga"><strong>Benefícios:</strong> {vaga.beneficios.join(", ")}</p>}
                {vaga.cursos.length > 0 && <p className="descricao-vaga"><strong>Cursos exigidos:</strong> {vaga.cursos.map(({ curso }) => curso.nome).join(", ")}</p>}
                {!vinculoAtivo && vaga.porto && <form action={retirarCandidaturasPorto}>
                  <input type="hidden" name="portoId" value={vaga.porto.id} />
                  <button className="botao secundario" type="submit">Retirar todas as candidaturas de {vaga.porto.nome}</button>
                </form>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao painel-cursos">
        <h2>{mostrarTodosCursos ? "Todos os cursos" : "Meus cursos"}</h2>
        <p className="ajuda">
          {mostrarTodosCursos
            ? "Todos os cursos cadastrados, dos mais próximos dos seus portos para os menos próximos."
            : "Cursos próximos dos seus portos."}
        </p>
        <p>
          {mostrarTodosCursos ? (
            <Link href="/navegante">Ver só meus cursos</Link>
          ) : (
            <Link href="/navegante?cursos=todos">Ver todos os cursos</Link>
          )}
        </p>
        <BuscaEscolha
          id="busca-curso"
          rotulo="Buscar curso"
          placeholder="Digite o nome do curso"
          ajuda="Use as setas para escolher e Enter para marcar o curso."
          recomendados={recomendadosCursos}
          buscar={buscarCursos}
          escolher={escolherCurso}
          campo="cursoId"
          vazio="Nenhum curso próximo dos seus portos no momento."
        />
        <h3>Cursos escolhidos</h3>
        {cursosEscolhidos.length === 0 ? (
          <p className="vazio">Você ainda não escolheu cursos.</p>
        ) : (
          <ul className="lista">
            {cursosEscolhidos.map((curso) => (
              <li key={curso.id}>
                <strong>{curso.nome}</strong>{" "}
                <form action={removerCursoEscolhido} className="form-remover-porto">
                  <input type="hidden" name="cursoId" value={curso.id} />
                  <button className="botao-x" type="submit" aria-label={`Remover ${curso.nome}`} title="Remover curso">×</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <section id="cursos-realizados">
          <h3>Cursos realizados</h3>
          {navegante.CursoRealizado.length === 0 ? (
            <p className="vazio">Você ainda não registrou cursos realizados.</p>
          ) : (
            <ul className="lista">
              {navegante.CursoRealizado.map((curso) => (
                <li key={curso.id}>
                  <strong>{curso.curso}</strong>{" "}
                  <span className="ajuda">
                    · {curso.instituicao} · {curso.cargaHoraria}h · {MODALIDADE_ROTULO[curso.modalidade ?? ""] ?? "modalidade não informada"}
                    {" · "}{curso.dataRealizacao.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </span>
                  <p className="descricao-vaga">{curso.descricao}</p>
                  <form action={removerCursoRealizado}>
                    <input type="hidden" name="cursoRealizadoId" value={curso.id} />
                    <button className="botao secundario" type="submit">Remover</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {!mostrarFormularioCurso && (
            <p>
              <Link className="botao" href="/navegante?incluir=curso#cursos-realizados">Incluir curso</Link>
            </p>
          )}
          {mostrarFormularioCurso && (
            <>
              <h4>Registrar curso realizado</h4>
              <FormularioCursoRealizado />
              <p>
                <Link href="/navegante#cursos-realizados">Cancelar</Link>
              </p>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
