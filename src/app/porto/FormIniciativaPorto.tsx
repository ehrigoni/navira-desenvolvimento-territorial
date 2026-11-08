"use client";

import { useActionState, useEffect, useRef } from "react";
import { publicarIniciativa, type EstadoAcao } from "./actions";

const inicial: EstadoAcao = {};

export default function FormIniciativaPorto() {
  const [estado, acao, pendente] = useActionState(publicarIniciativa, inicial);
  const formulario = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};

  useEffect(() => {
    if (estado.sucesso) formulario.current?.reset();
  }, [estado.sucesso]);

  return (
    <form ref={formulario} action={acao} className="formulario" noValidate>
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="alerta sucesso" role="status">{estado.sucesso}</p>}

      <div className={`campo ${e.categoria ? "invalido" : ""}`}>
        <label htmlFor="iniciativa-categoria">Categoria</label>
        <select id="iniciativa-categoria" name="categoria" defaultValue="">
          <option value="" disabled>Selecione</option>
          <option value="CURSO">Curso</option>
          <option value="VAGA_EMPREGO">Vaga de emprego</option>
          <option value="VOLUNTARIADO">Voluntariado</option>
          <option value="MUTIRAO">Mutirão</option>
          <option value="EVENTO">Evento</option>
        </select>
        {e.categoria && <p className="erro-campo">{e.categoria}</p>}
      </div>

      <div className={`campo ${e.titulo ? "invalido" : ""}`}>
        <label htmlFor="iniciativa-titulo">Título</label>
        <input id="iniciativa-titulo" name="titulo" />
        {e.titulo && <p className="erro-campo">{e.titulo}</p>}
      </div>

      <div className={`campo ${e.descricao ? "invalido" : ""}`}>
        <label htmlFor="iniciativa-descricao">Descrição</label>
        <textarea id="iniciativa-descricao" name="descricao" rows={3} />
        {e.descricao && <p className="erro-campo">{e.descricao}</p>}
      </div>

      <div className={`campo ${e.modalidade ? "invalido" : ""}`}>
        <label htmlFor="iniciativa-modalidade">Modalidade</label>
        <select id="iniciativa-modalidade" name="modalidade" defaultValue="">
          <option value="" disabled>Selecione</option>
          <option value="PRESENCIAL">Presencial</option>
          <option value="ONLINE">Online</option>
          <option value="AMBOS">Ambos</option>
        </select>
        {e.modalidade && <p className="erro-campo">{e.modalidade}</p>}
      </div>

      <div className={`campo ${e.vagasTotais ? "invalido" : ""}`}>
        <label htmlFor="iniciativa-vagas">Número de vagas (opcional)</label>
        <input id="iniciativa-vagas" name="vagasTotais" type="number" min={1} />
        {e.vagasTotais && <p className="erro-campo">{e.vagasTotais}</p>}
      </div>

      <div className={`campo ${e.inicio || e.termino ? "invalido" : ""}`}>
        <label htmlFor="iniciativa-inicio">Início (opcional)</label>
        <input id="iniciativa-inicio" name="inicio" type="date" />
        <label htmlFor="iniciativa-termino">Término (opcional)</label>
        <input id="iniciativa-termino" name="termino" type="date" />
        {(e.inicio || e.termino) && <p className="erro-campo">{e.inicio ?? e.termino}</p>}
      </div>

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Cadastrar iniciativa"}
      </button>
    </form>
  );
}
