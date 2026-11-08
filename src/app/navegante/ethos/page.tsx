import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { decifrarDadoSensivel, type ContextoDadoSensivel } from "@/lib/ethos-crypto";
import { BLOCOS_ETHOS } from "@/lib/questionario-ethos";
import QuestionarioEthosForm from "./QuestionarioEthosForm";

type Respostas = Record<string, string | string[]>;

export default async function PaginaEthos({
  searchParams,
}: {
  searchParams: Promise<{ bloco?: string }>;
}) {
  const sessao = await exigirSessao("NAVEGANTE");
  const navegante = await db.navegante.findUnique({
    where: { usuarioId: sessao.sub },
    select: {
      id: true,
      ethosBlocoAtual: true,
      ethosConcluidoEm: true,
      dadosSensiveis: true,
      RespostaEthos: { select: { questaoId: true, valor: true } },
    },
  });
  if (!navegante) redirect("/entrar");

  // Após a conclusão o questionário continua acessível para edição, com todas as etapas desbloqueadas.
  const concluido = navegante.ethosConcluidoEm != null;
  const blocoSalvo = navegante.ethosBlocoAtual;
  const blocoMaximo = concluido ? BLOCOS_ETHOS.length - 1 : blocoSalvo;

  const { bloco: blocoParam } = await searchParams;
  const blocoSolicitado = Number(blocoParam ?? (concluido ? 0 : blocoSalvo));
  if (!Number.isInteger(blocoSolicitado) || blocoSolicitado < 0) redirect(`/navegante/ethos?bloco=${blocoSalvo}`);
  if (blocoSolicitado > blocoMaximo) redirect(`/navegante/ethos?bloco=${blocoMaximo}`);

  const bloco = BLOCOS_ETHOS[blocoSolicitado];
  if (!bloco) redirect(`/navegante/ethos?bloco=${blocoSalvo}`);

  const respostas = lerRespostas(navegante.RespostaEthos);
  // Consentimento por campo: o campo só é autorizado se o valor cifrado correspondente existir.
  const consentimentosSensivel = {
    "Q1.7": navegante.dadosSensiveis?.racaCorCifrado != null,
    "Q1.8": navegante.dadosSensiveis?.religiaoCifrado != null,
  };

  if (bloco.numero === 1) {
    // Falha ao decifrar (chave trocada ou formato antigo) não derruba a página: a pergunta volta em branco para nova resposta.
    const raca = consentimentosSensivel["Q1.7"]
      ? lerCampoSensivel(navegante.dadosSensiveis?.racaCorCifrado, { naveganteId: navegante.id, campo: "racaCor" })
      : "Prefiro não responder";
    const religiao = consentimentosSensivel["Q1.8"]
      ? lerCampoSensivel(navegante.dadosSensiveis?.religiaoCifrado, { naveganteId: navegante.id, campo: "religiao" })
      : "Prefiro não responder";
    if (raca) respostas["Q1.7"] = raca; else delete respostas["Q1.7"];
    if (religiao) respostas["Q1.8"] = religiao; else delete respostas["Q1.8"];
  }

  const recusado = bloco.numero === 0 && respostas["Q0.1"] === "Não";
  const progresso = Math.round(((bloco.numero + 1) / BLOCOS_ETHOS.length) * 100);

  return (
    <main className={`central questionario-page ${bloco.numero === 10 ? "questionario-final" : ""}`}>
      <nav className="ethos-navegacao" aria-label="Etapas do questionário">
        <ol>
          {BLOCOS_ETHOS.map((item) => {
            const desbloqueado = item.numero <= blocoMaximo;
            const atual = item.numero === bloco.numero;
            return (
              <li key={item.numero}>
                {desbloqueado ? (
                  <Link
                    className={`ethos-navegacao-item ${atual ? "atual" : ""}`}
                    href={`/navegante/ethos?bloco=${item.numero}`}
                    aria-current={atual ? "step" : undefined}
                  >
                    <span className="ethos-navegacao-numero" aria-hidden="true">{item.numero + 1}</span>
                    <span className="ethos-navegacao-titulo">{item.titulo}</span>
                  </Link>
                ) : (
                  <span className="ethos-navegacao-item bloqueado" title="Preencha as etapas anteriores para desbloquear">
                    <span className="ethos-navegacao-numero" aria-hidden="true">🔒</span>
                    <span className="ethos-navegacao-titulo">{item.titulo}</span>
                    <span className="sr-only">(etapa bloqueada)</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="questionario-progresso">
        <div className="questionario-progresso-texto">
          <span>Perfil de Travessia</span>
          <span>Etapa {bloco.numero + 1} de {BLOCOS_ETHOS.length}</span>
        </div>
        <progress value={progresso} max="100" aria-label={`Questionário ${progresso}% concluído`} />
      </div>
      <h1>{bloco.numero === 10 ? "Sua Travessia" : bloco.titulo}</h1>
      {bloco.descricao && <p className="subtitulo">{bloco.descricao}</p>}
      {bloco.numero === 10 && (
        <p className="texto-travessia">
          Imagine que nos encontremos novamente daqui a cinco anos. O que precisaria ter acontecido para você dizer:
          <strong> “Essa foi a melhor fase da minha vida”?</strong>
        </p>
      )}
      {bloco.numero !== 10 && (
        <p className="ajuda aviso-privacidade">
          Suas respostas não são exibidas para empresas. Perguntas sensíveis são opcionais e só serão armazenadas com sua autorização explícita.
        </p>
      )}
      <div className="cartao">
        <QuestionarioEthosForm
          bloco={bloco}
          respostas={respostas}
          consentimentosSensivel={consentimentosSensivel}
          recusado={recusado}
        />
      </div>
    </main>
  );
}

function lerCampoSensivel(cifrado: string | null | undefined, contexto: ContextoDadoSensivel): string | undefined {
  if (!cifrado) return undefined;
  try {
    return decifrarDadoSensivel(cifrado, contexto);
  } catch (e) {
    console.error("[ethos] dado sensível não pôde ser decifrado", contexto.campo, e);
    return undefined;
  }
}

function lerRespostas(linhas: { questaoId: string; valor: Prisma.JsonValue }[]): Respostas {
  const respostas: Respostas = {};
  for (const { questaoId, valor } of linhas) {
    if (typeof valor === "string" || (Array.isArray(valor) && valor.every((item) => typeof item === "string"))) {
      respostas[questaoId] = valor as string | string[];
    }
  }
  return respostas;
}
