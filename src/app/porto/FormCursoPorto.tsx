"use client";

import { useActionState, useEffect, useRef } from "react";
import { publicarCurso, type EstadoAcao } from "./actions";

const inicial: EstadoAcao = {};

export default function FormCursoPorto() {
  const [estado, acao, pendente] = useActionState(publicarCurso, inicial);
  const formulario = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};

  useEffect(() => {
    if (estado.sucesso) formulario.current?.reset();
  }, [estado.sucesso]);

  return (
    <form ref={formulario} action={acao} className="formulario" noValidate>
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="alerta sucesso" role="status">{estado.sucesso}</p>}

      <div className={`campo ${e.nome ? "invalido" : ""}`}>
        <label htmlFor="curso-porto-nome">Nome do curso</label>
        <input id="curso-porto-nome" name="nome" />
        {e.nome && <p className="erro-campo">{e.nome}</p>}
      </div>

      <div className="campo">
        <label htmlFor="curso-porto-descricao">Conteúdo (opcional)</label>
        <textarea id="curso-porto-descricao" name="descricao" rows={3} />
      </div>

      <div className={`campo ${e.cargaHoraria ? "invalido" : ""}`}>
        <label htmlFor="curso-porto-carga">Carga horária (horas)</label>
        <input id="curso-porto-carga" name="cargaHoraria" type="number" min={1} max={5000} />
        {e.cargaHoraria && <p className="erro-campo">{e.cargaHoraria}</p>}
      </div>

      <div className={`campo ${e.instituicaoEnsino ? "invalido" : ""}`}>
        <label htmlFor="curso-porto-instituicao">Instituição que oferece</label>
        <input id="curso-porto-instituicao" name="instituicaoEnsino" />
        {e.instituicaoEnsino && <p className="erro-campo">{e.instituicaoEnsino}</p>}
      </div>

      <div className={`campo ${e.modalidade ? "invalido" : ""}`}>
        <label htmlFor="curso-porto-modalidade">Modalidade</label>
        <select id="curso-porto-modalidade" name="modalidade" defaultValue="">
          <option value="" disabled>Selecione</option>
          <option value="PRESENCIAL">Presencial</option>
          <option value="ONLINE">Online</option>
          <option value="AMBOS">Ambos</option>
        </select>
        {e.modalidade && <p className="erro-campo">{e.modalidade}</p>}
      </div>

      <div className={`campo ${e.inicio || e.termino ? "invalido" : ""}`}>
        <label htmlFor="curso-porto-inicio">Data de início (opcional)</label>
        <input id="curso-porto-inicio" name="inicio" type="date" />
        {e.inicio && <p className="erro-campo">{e.inicio}</p>}
        <label htmlFor="curso-porto-termino">Data de término (opcional)</label>
        <input id="curso-porto-termino" name="termino" type="date" />
        {e.termino && <p className="erro-campo">{e.termino}</p>}
      </div>

      <div className={`campo ${e.vagasDisponiveis ? "invalido" : ""}`}>
        <label htmlFor="curso-porto-vagas">Vagas disponíveis (opcional)</label>
        <input id="curso-porto-vagas" name="vagasDisponiveis" type="number" min={1} max={1000000} />
        {e.vagasDisponiveis && <p className="erro-campo">{e.vagasDisponiveis}</p>}
      </div>

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Cadastrar curso"}
      </button>
    </form>
  );
}
