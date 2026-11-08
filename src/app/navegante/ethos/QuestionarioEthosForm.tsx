"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { salvarBlocoEthos, type EstadoBlocoEthos } from "./actions";
import type { BlocoEthos, QuestaoEthos } from "@/lib/questionario-ethos";

type Props = {
  bloco: BlocoEthos;
  respostas: Record<string, string | string[]>;
  consentimentosSensivel: Record<string, boolean>;
  recusado: boolean;
};

const inicial: EstadoBlocoEthos = {};

export default function QuestionarioEthosForm({ bloco, respostas, consentimentosSensivel, recusado }: Props) {
  const [estado, acao, pendente] = useActionState(salvarBlocoEthos, inicial);
  const [valores, setValores] = useState(respostas);
  const [consentimentos, setConsentimentos] = useState(consentimentosSensivel);
  const [temFilhos, setTemFilhos] = useState(valores["Q1.6"] === "Sim");

  function atualizarResposta(id: string, valor: string | string[]) {
    setValores((anteriores) => ({ ...anteriores, [id]: valor }));
  }

  return (
    <>
      {(estado.recusado || recusado) && (
        <div className="alerta aviso-questionario" role="status">
          <p>Para continuar, é necessário concordar em participar do Mapa de Mobilidade Humana NAVIRA. Se não quiser participar, você pode sair da sua conta.</p>
          <form action="/sair" method="post">
            <button className="botao secundario" type="submit">Sair da conta</button>
          </form>
        </div>
      )}

      <form action={acao} className={`formulario questionario-formulario ${bloco.numero === 10 ? "travessia-final" : ""}`} noValidate>
        <input type="hidden" name="bloco" value={bloco.numero} />
        {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}

        {bloco.questoes.map((questao) => {
          if (questao.dependeDe && !temFilhos) return null;
          const erro = estado.erros?.[questao.id];
          const valor = valores[questao.id];
          const id = questao.id.replace(".", "-").replace("_", "-");

          return (
            <div className={`campo pergunta-ethos ${erro ? "invalido" : ""}`} key={questao.id}>
              <label htmlFor={id}>{questao.pergunta}</label>
              {questao.ajuda && <span className="ajuda">{questao.ajuda}</span>}
              {renderizarResposta(
                questao,
                valor,
                id,
                consentimentos[questao.id] ?? false,
                Boolean(erro),
                atualizarResposta,
                (questaoId, consentido) => setConsentimentos((anteriores) => ({ ...anteriores, [questaoId]: consentido })),
                setTemFilhos,
              )}
              {erro && <p className="erro-campo" role="alert">{erro}</p>}
            </div>
          );
        })}

        <div className="acoes-questionario">
          {bloco.numero > 0 && (
            <button className="botao secundario" type="submit" name="intent" value="voltar" disabled={pendente}>
              Voltar
            </button>
          )}
          <button className="botao" type="submit" name="intent" value="avancar" disabled={pendente}>
            {pendente ? "Salvando..." : bloco.numero === 10 ? "Concluir questionário" : "Salvar e continuar"}
          </button>
        </div>
      </form>
    </>
  );
}

function renderizarResposta(
  questao: QuestaoEthos,
  valor: string | string[] | undefined,
  id: string,
  consentimentoSensivel: boolean,
  invalido: boolean,
  atualizarResposta: (id: string, valor: string | string[]) => void,
  atualizarConsentimento: (id: string, consentido: boolean) => void,
  setTemFilhos: (tem: boolean) => void,
) {
  if (questao.tipo === "booleano") {
    return (
      <select
        id={id}
        name={questao.id}
        value={typeof valor === "string" ? valor : ""}
        required
        onChange={(evento) => {
          atualizarResposta(questao.id, evento.target.value);
          if (questao.id === "Q1.6") setTemFilhos(evento.target.value === "Sim");
        }}
        aria-invalid={invalido}
      >
        <option value="" disabled>Selecione</option>
        <option value="Sim">Sim</option>
        <option value="Não">Não</option>
      </select>
    );
  }

  if (questao.tipo === "multipla") {
    const selecionados = Array.isArray(valor) ? valor : [];
    return (
      <div className="opcoes opcoes-check" role="group" aria-labelledby={`${id}-rotulo`}>
        <span className="sr-only" id={`${id}-rotulo`}>{questao.pergunta}</span>
        {questao.opcoes?.map((opcao, indice) => (
          <label className="opcao-check" key={opcao}>
            <input
              type="checkbox"
              name={questao.id}
              value={opcao}
              checked={selecionados.includes(opcao)}
              aria-label={opcao}
              aria-invalid={invalido}
              id={indice === 0 ? id : undefined}
              onChange={(evento) => atualizarResposta(
                questao.id,
                evento.target.checked
                  ? [...selecionados, opcao]
                  : selecionados.filter((item) => item !== opcao),
              )}
            />
            <span>{opcao}</span>
          </label>
        ))}
      </div>
    );
  }

  if (questao.tipo === "selecao" || questao.tipo === "renda" || questao.tipo === "escala" || questao.tipo === "sensivel") {
    const respostaInicial = typeof valor === "string" ? valor : questao.tipo === "sensivel" ? "Prefiro não responder" : "";
    return (
      <>
        {questao.tipo === "sensivel" && (
          <label className="consentimento-sensivel">
            <input
              type="checkbox"
              name={`consentimento_${questao.id}`}
              value="sim"
              checked={consentimentoSensivel}
              aria-label={`Autorizo o tratamento da resposta para ${questao.pergunta}`}
              onChange={(evento) => atualizarConsentimento(questao.id, evento.target.checked)}
            />
            <span>Autorizo o tratamento desta informação sensível para esta finalidade. A resposta será armazenada criptografada e não será usada para excluir oportunidades.</span>
          </label>
        )}
        <select
          id={id}
          name={questao.id}
          value={respostaInicial}
          onChange={(evento) => atualizarResposta(questao.id, evento.target.value)}
          required
          aria-invalid={invalido}
        >
          <option value="" disabled>Selecione</option>
          {questao.tipo === "escala"
            ? Array.from({ length: 10 }, (_, indice) => {
                const numero = String(indice + 1);
                const rotulo = indice === 0 && questao.id === "Q2.1"
                  ? `${numero} — Não gosto`
                  : indice === 9 && questao.id === "Q2.1"
                    ? `${numero} — Gosto muito`
                    : indice === 0 && questao.id === "Q2.4"
                      ? `${numero} — Nenhuma oportunidade`
                      : indice === 9 && questao.id === "Q2.4"
                        ? `${numero} — Muitas oportunidades`
                        : numero;
                return <option key={numero} value={numero}>{rotulo}</option>;
              })
            : questao.opcoes?.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
        </select>
      </>
    );
  }

  const numero = questao.tipo === "numero";
  const longo = questao.tipo === "texto_longo";
  const props = {
    id,
    name: questao.id,
    required: true,
    value: typeof valor === "string" ? valor : "",
    onChange: (evento: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => atualizarResposta(questao.id, evento.target.value),
    maxLength: questao.tipo === "texto" ? 120 : 5000,
    "aria-invalid": invalido,
  };
  return longo
    ? <textarea {...props} rows={questao.id === "Q10.1" ? 7 : 4} />
    : <input {...props} type={numero ? "number" : "text"} min={numero ? 1 : undefined} max={numero ? questao.id === "Q1.2" ? 120 : 30 : undefined} />;
}
