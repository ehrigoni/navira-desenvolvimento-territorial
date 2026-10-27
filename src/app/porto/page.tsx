import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { formatarSalario } from "@/lib/matching";

export default async function PainelPorto() {
  const sessao = await exigirSessao("PORTO");

  const porto = await db.porto.findUnique({ where: { usuarioId: sessao.sub } });
  if (!porto) redirect("/entrar");

  const [outrosPortos, vagas, cursos] = await Promise.all([
    db.porto.findMany({
      where: { cidade: porto.cidade, uf: porto.uf, NOT: { id: porto.id } },
      orderBy: { nome: "asc" },
      take: 50,
    }),
    db.vaga.findMany({
      where: { ativa: true, cidade: porto.cidade, uf: porto.uf },
      include: { destino: { select: { razaoSocial: true } } },
      orderBy: { publicadaEm: "desc" },
      take: 20,
    }),
    db.curso.findMany({
      where: {
        OR: [
          { modalidade: "REMOTA" },
          { destino: { cidade: porto.cidade, uf: porto.uf } },
          { destino: { portos: { some: { portoId: porto.id } } } },
        ],
      },
      take: 20,
    }),
  ]);

  return (
    <main className="conteudo">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>{porto.nome}</h1>
          <p className="subtitulo">
            {porto.tipo.toLowerCase()} · {porto.cidade}/{porto.uf} · CEP {porto.cep}
          </p>
        </div>
        <form action="/sair" method="post">
          <button className="botao secundario" type="submit">
            Sair
          </button>
        </form>
      </header>

      <section className="cartao">
        <h2 style={{ marginTop: 0 }}>Vagas na sua região</h2>
        {vagas.length === 0 ? (
          <p className="vazio">
            Nenhuma vaga ativa em {porto.cidade}/{porto.uf}.
          </p>
        ) : (
          <ul className="lista">
            {vagas.map((v) => (
              <li key={v.id}>
                <strong>{v.titulo}</strong>
                <div className="ajuda">{[v.destino.razaoSocial, formatarSalario(v.salario)].filter(Boolean).join(" · ")}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao">
        <h2 style={{ marginTop: 0 }}>Cursos</h2>
        {cursos.length === 0 ? (
          <p className="vazio">Nenhum curso disponível para este território.</p>
        ) : (
          <ul className="lista">
            {cursos.map((c) => (
              <li key={c.id}>
                <strong>{c.titulo}</strong>
                <span className="ajuda">
                  {" "}
                  · {c.modalidade.toLowerCase()}
                  {c.instituicao ? ` · ${c.instituicao}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao">
        <h2 style={{ marginTop: 0 }}>Outros portos da região</h2>
        {outrosPortos.length === 0 ? (
          <p className="vazio">
            Ainda não há outros portos em {porto.cidade}/{porto.uf}.
          </p>
        ) : (
          <ul className="lista">
            {outrosPortos.map((p) => (
              <li key={p.id}>
                <strong>{p.nome}</strong>{" "}
                <span className="ajuda">
                  · {p.tipo.toLowerCase()} · CEP {p.cep}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
