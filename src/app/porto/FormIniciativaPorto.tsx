"use client";

import { useActionState } from "react";
import { publicarIniciativa, type EstadoAcao } from "./actions";
import DataInput from "../DataInput";
import { useFormularioComValidacao } from "../useFormularioComValidacao";
import { CATEGORIAS_INICIATIVA_CADASTRO, CATEGORIA_INICIATIVA_ROTULO } from "@/lib/porto-regras";

const inicial: EstadoAcao = {};

export default function FormIniciativaPorto() {
  const [estado, acao, pendente] = useActionState(publicarIniciativa, inicial);
  const { formulario, enviar } = useFormularioComValidacao(acao, estado);
  const e = estado.erros ?? {};

  return (
    <form ref={formulario} action={acao} onSubmit={enviar} className="formulario" noValidate>
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="alerta sucesso" role="status">{estado.sucesso}</p>}

      <div className={`campo ${e.categoria ? "invalido" : ""}`}>
        <label htmlFor="iniciativa-categoria">Categoria</label>
        <select id="iniciativa-categoria" name="categoria" defaultValue="">
          <option value="" disabled>Selecione</option>
          {CATEGORIAS_INICIATIVA_CADASTRO.map((categoria) => {
            const rotulo = CATEGORIA_INICIATIVA_ROTULO[categoria];
            return <option key={categoria} value={categoria}>{rotulo[0].toUpperCase() + rotulo.slice(1)}</option>;
          })}
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
        <DataInput id="iniciativa-inicio" name="inicio" invalid={Boolean(e.inicio)} />
        <label htmlFor="iniciativa-termino">Término (opcional)</label>
        <DataInput id="iniciativa-termino" name="termino" invalid={Boolean(e.termino)} />
        {(e.inicio || e.termino) && <p className="erro-campo">{e.inicio ?? e.termino}</p>}
      </div>

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Cadastrar iniciativa"}
      </button>
    </form>
  );
}
