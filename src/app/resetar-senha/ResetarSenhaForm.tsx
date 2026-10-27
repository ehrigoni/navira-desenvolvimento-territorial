"use client";

import { useActionState } from "react";
import { resetarSenha, type EstadoResetar } from "./actions";

const inicial: EstadoResetar = {};

export default function ResetarSenhaForm({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(resetarSenha, inicial);
  const e = estado.erros ?? {};

  return (
    <form action={acao} className="formulario" noValidate>
      <input type="hidden" name="token" value={token} />
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}

      <div className={`campo ${e.senha ? "invalido" : ""}`}>
        <label htmlFor="senha">Nova senha</label>
        <input id="senha" name="senha" type="password" autoComplete="new-password" />
        <span className="ajuda">De 8 a 72 caracteres.</span>
        {e.senha && <p className="erro-campo">{e.senha}</p>}
      </div>

      <div className={`campo ${e.confirmacao ? "invalido" : ""}`}>
        <label htmlFor="confirmacao">Confirme a nova senha</label>
        <input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" />
        {e.confirmacao && <p className="erro-campo">{e.confirmacao}</p>}
      </div>

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
