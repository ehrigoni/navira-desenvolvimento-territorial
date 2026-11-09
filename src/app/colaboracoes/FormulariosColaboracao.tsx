"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarMeta, contribuirComoNavegante, contribuirComoPorto, decidirContribuicao, type EstadoColaboracao } from "./actions";

const inicial: EstadoColaboracao = {};

function Mensagem({ estado }: { estado: EstadoColaboracao }) {
  return <>{estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}{estado.sucesso && <p className="alerta sucesso" role="status">{estado.sucesso}</p>}</>;
}

export function FormMeta({ iniciativaId }: { iniciativaId: string }) {
  const [estado, acao, pendente] = useActionState(criarMeta, inicial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado.sucesso) ref.current?.reset(); }, [estado]);
  return <form ref={ref} action={acao} className="formulario">
    <Mensagem estado={estado} />
    <input type="hidden" name="iniciativaId" value={iniciativaId} />
    <label>Tipo de colaboração<input name="tipo" maxLength={100} required placeholder="Ex.: roupas" /></label>
    <label>Unidade<input name="unidade" maxLength={50} required placeholder="Ex.: peças, kg ou R$" /></label>
    <label>Meta<input name="meta" type="number" min="0.01" max="9999999999.99" step="0.01" required /></label>
    <button className="botao secundario" disabled={pendente}>Adicionar meta</button>
  </form>;
}

export function FormContribuicao({ metaId, papel, unidade }: { metaId: string; papel: "PORTO" | "NAVEGANTE"; unidade: string }) {
  const [estado, acao, pendente] = useActionState(papel === "PORTO" ? contribuirComoPorto : contribuirComoNavegante, inicial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (estado.sucesso) ref.current?.reset(); }, [estado]);
  return <form ref={ref} action={acao} className="formulario-linha">
    <Mensagem estado={estado} />
    <input type="hidden" name="metaId" value={metaId} />
    <label>Quantidade ({unidade}) <input name="quantidade" type="number" min="0.01" max="9999999999.99" step="0.01" required /></label>
    <button className="botao secundario" disabled={pendente}>{pendente ? "Registrando..." : "Colaborar"}</button>
  </form>;
}

export function FormDecisao({ id }: { id: string }) {
  const [estado, acao, pendente] = useActionState(decidirContribuicao, inicial);
  return <form action={acao} className="formulario-linha">
    <Mensagem estado={estado} />
    <input type="hidden" name="contribuicaoId" value={id} />
    <button className="botao" name="decisao" value="CONFIRMADA" disabled={pendente}>Confirmar</button>
    <button className="botao secundario" name="decisao" value="RECUSADA" disabled={pendente}>Recusar</button>
  </form>;
}
