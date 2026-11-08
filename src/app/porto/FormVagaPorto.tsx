"use client";

import { useActionState, useEffect, useRef } from "react";
import { publicarVaga, type EstadoAcao } from "./actions";

const inicial: EstadoAcao = {};

export default function FormVagaPorto() {
  const [estado, acao, pendente] = useActionState(publicarVaga, inicial);
  const formulario = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};

  useEffect(() => {
    if (estado.sucesso) formulario.current?.reset();
  }, [estado.sucesso]);

  return (
    <form ref={formulario} action={acao} className="formulario" noValidate>
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="alerta sucesso" role="status">{estado.sucesso}</p>}

      <div className={`campo ${e.titulo ? "invalido" : ""}`}>
        <label htmlFor="vaga-titulo">Cargo</label>
        <input id="vaga-titulo" name="titulo" placeholder="Ex.: Auxiliar de cozinha" />
        {e.titulo && <p className="erro-campo">{e.titulo}</p>}
      </div>

      <div className={`campo ${e.descricao ? "invalido" : ""}`}>
        <label htmlFor="vaga-descricao">Descrição e necessidades</label>
        <textarea id="vaga-descricao" name="descricao" rows={3} />
        {e.descricao && <p className="erro-campo">{e.descricao}</p>}
      </div>

      <div className={`campo ${e.quantidade ? "invalido" : ""}`}>
        <label htmlFor="vaga-quantidade">Quantas pessoas</label>
        <input id="vaga-quantidade" name="quantidade" type="number" min={1} max={999} defaultValue={1} />
        {e.quantidade && <p className="erro-campo">{e.quantidade}</p>}
      </div>

      <div className={`campo ${e.salario ? "invalido" : ""}`}>
        <label htmlFor="vaga-salario-min">Salário mínimo (R$, opcional)</label>
        <input id="vaga-salario-min" name="salarioMin" type="number" min={0} step="0.01" />
        <label htmlFor="vaga-salario-max">Salário máximo (R$, opcional)</label>
        <input id="vaga-salario-max" name="salarioMax" type="number" min={0} step="0.01" />
        {e.salario && <p className="erro-campo">{e.salario}</p>}
      </div>

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Publicando..." : "Publicar vaga"}
      </button>
    </form>
  );
}
