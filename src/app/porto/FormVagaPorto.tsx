"use client";

import { useActionState, useEffect, useRef } from "react";
import { publicarVaga, type EstadoAcao } from "./actions";

const inicial: EstadoAcao = {};

export default function FormVagaPorto({ cursos }: { cursos: { id: string; nome: string; instituicaoEnsino: string | null }[] }) {
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

      <div className="campo">
        <label htmlFor="vaga-requisitos">Requisitos (opcional)</label>
        <textarea id="vaga-requisitos" name="requisitos" rows={3} />
      </div>

      <div className="campo">
        <label htmlFor="vaga-expectativas">Expectativas (opcional)</label>
        <textarea id="vaga-expectativas" name="expectativas" rows={3} />
      </div>

      <div className="campo">
        <label htmlFor="vaga-beneficios">Benefícios (opcional)</label>
        <textarea id="vaga-beneficios" name="beneficios" rows={3} aria-describedby="vaga-beneficios-ajuda" />
        <span className="ajuda" id="vaga-beneficios-ajuda">Informe um benefício por linha.</span>
      </div>

      <fieldset className={`campo ${e.cursos ? "invalido" : ""}`}>
        <legend>Cursos exigidos (opcional)</legend>
        {cursos.length ? (
          <div className="opcoes-check">
            {cursos.map((curso) => (
              <label className="opcao-check" key={curso.id}>
                <input type="checkbox" name="cursos" value={curso.id} /> {curso.nome}
                {curso.instituicaoEnsino ? ` · ${curso.instituicaoEnsino}` : ""}
              </label>
            ))}
          </div>
        ) : <p className="ajuda">Nenhum curso cadastrado para selecionar.</p>}
        {e.cursos && <p className="erro-campo">{e.cursos}</p>}
      </fieldset>

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
