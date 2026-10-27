import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { formatarSalario, indiceLocal } from "@/lib/matching";

export default async function PainelNavegante() {
  const sessao = await exigirSessao("NAVEGANTE");

  const navegante = await db.navegante.findUnique({
    where: { usuarioId: sessao.sub },
    include: {
      usuario: { select: { ethosStatus: true } },
      portos: { include: { porto: true } },
    },
  });
  if (!navegante) redirect("/entrar");

  const portos = navegante.portos.map((i) => i.porto);
  const vagasAtivas = await db.vaga.findMany({
    where: { ativa: true },
    include: { destino: { select: { razaoSocial: true } }, requisitos: { include: { curso: true } } },
    orderBy: { publicadaEm: "desc" },
    take: 100,
  });

  // Mais próximas dos portos primeiro; empate mantém a ordem de publicação.
  const vagas = vagasAtivas
    .map((vaga) => ({ vaga, indice: indiceLocal(vaga, portos) }))
    .sort((a, b) => b.indice - a.indice)
    .slice(0, 20);

  // Cursos exigidos pelas vagas de maior índice (docs/navegante/relacoes-meus-portos.md).
  const cursos = new Map<string, { id: string; titulo: string; modalidade: string }>();
  for (const { vaga } of vagas.slice(0, 5)) {
    for (const req of vaga.requisitos) cursos.set(req.curso.id, req.curso);
  }

  const semEthos = navegante.usuario.ethosStatus !== "CONCLUIDO";

  return (
    <main className="conteudo">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Olá, {sessao.nome.split(" ")[0]}</h1>
          <p className="subtitulo">Seu painel de portos, vagas e cursos.</p>
        </div>
        <form action="/sair" method="post">
          <button className="botao secundario" type="submit">
            Sair
          </button>
        </form>
      </header>

      {semEthos && (
        <p className="alerta sucesso" style={{ marginBottom: "var(--espaco-md)" }}>
          Seu Ethos ainda não foi concluído. <Link href="/navegante/ethos">Continuar</Link>
        </p>
      )}

      <section className="cartao">
        <h2 style={{ marginTop: 0 }}>Meus portos</h2>
        {portos.length === 0 ? (
          <p className="vazio">Você ainda não está inscrito em nenhum porto.</p>
        ) : (
          <ul className="lista">
            {portos.map((p) => (
              <li key={p.id}>
                <strong>{p.nome}</strong>{" "}
                <span className="ajuda">
                  · {p.cidade}/{p.uf} · CEP {p.cep}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao">
        <h2 style={{ marginTop: 0 }}>Vagas para você</h2>
        <p className="ajuda">
          Ordenadas pela proximidade dos seus portos. A compatibilidade com o Ethos entra quando o questionário estiver pronto.
        </p>
        {vagas.length === 0 ? (
          <p className="vazio">Nenhuma vaga ativa no momento.</p>
        ) : (
          <ul className="lista">
            {vagas.map(({ vaga, indice }) => (
              <li key={vaga.id}>
                <strong>{vaga.titulo}</strong>
                {portos.length > 0 && <span className="tag">Índice {indice}</span>}
                <div className="ajuda">
                  {[
                    vaga.destino.razaoSocial,
                    vaga.cidade && vaga.uf ? `${vaga.cidade}/${vaga.uf}` : null,
                    formatarSalario(vaga.salario),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {vaga.descricao && <p style={{ margin: "4px 0 0" }}>{vaga.descricao}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {cursos.size > 0 && (
        <section className="cartao">
          <h2 style={{ marginTop: 0 }}>Cursos que podem ajudar</h2>
          <ul className="lista">
            {[...cursos.values()].map((c) => (
              <li key={c.id}>
                <strong>{c.titulo}</strong> <span className="ajuda">· {c.modalidade.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
