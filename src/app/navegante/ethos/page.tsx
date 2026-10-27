import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";

export default async function PaginaEthos() {
  const sessao = await exigirSessao("NAVEGANTE");
  const navegante = await db.navegante.findUnique({
    where: { usuarioId: sessao.sub },
    select: { usuario: { select: { ethosStatus: true } } },
  });
  if (navegante?.usuario.ethosStatus === "CONCLUIDO") redirect("/navegante");

  return (
    <main className="central">
      <h1>Seu Ethos</h1>
      <div className="cartao">
        <p>
          Este é o ponto em que você retoma o questionário Ethos. O conteúdo das perguntas ainda não foi definido: o arquivo{" "}
          <code>docs/navegante/questionarioEthos.md</code> está vazio.
        </p>
        <p className="ajuda">Enquanto isso, você pode ver o seu painel.</p>
        <Link href="/navegante" className="botao">
          Ir para o painel
        </Link>
      </div>
    </main>
  );
}
