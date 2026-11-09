"use client";

import { useActionState } from "react";
import { adicionarCursoRealizado, type EstadoAcao } from "./actions";
import DataInput from "../DataInput";
import { useFormularioComValidacao } from "../useFormularioComValidacao";

const inicial: EstadoAcao = {};

export default function FormularioCursoRealizado() {
  const [estado, acao, pendente] = useActionState(adicionarCursoRealizado, inicial);
  const { formulario, enviar } = useFormularioComValidacao(acao, estado);
  const e = estado.erros ?? {};

  return (
    <form ref={formulario} action={acao} onSubmit={enviar} className="formulario" noValidate>
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="alerta" role="status">{estado.sucesso}</p>}

      <div className={`campo ${e.curso ? "invalido" : ""}`}>
        <label htmlFor="curso-nome">Curso</label>
        <input id="curso-nome" name="curso" />
        {e.curso && <p className="erro-campo">{e.curso}</p>}
      </div>

      <div className={`campo ${e.descricao ? "invalido" : ""}`}>
        <label htmlFor="curso-descricao">Conteúdo desenvolvido</label>
        <textarea id="curso-descricao" name="descricao" rows={3} />
        {e.descricao && <p className="erro-campo">{e.descricao}</p>}
      </div>

      <div className={`campo ${e.cargaHoraria ? "invalido" : ""}`}>
        <label htmlFor="curso-carga">Carga horária (horas)</label>
        <input id="curso-carga" name="cargaHoraria" type="number" min={1} max={5000} />
        {e.cargaHoraria && <p className="erro-campo">{e.cargaHoraria}</p>}
      </div>

      <div className={`campo ${e.instituicao ? "invalido" : ""}`}>
        <label htmlFor="curso-instituicao">Instituição de ensino</label>
        <input id="curso-instituicao" name="instituicao" />
        {e.instituicao && <p className="erro-campo">{e.instituicao}</p>}
      </div>

      <div className={`campo ${e.dataRealizacao ? "invalido" : ""}`}>
        <label htmlFor="curso-data">Data de realização</label>
        <DataInput id="curso-data" name="dataRealizacao" invalid={Boolean(e.dataRealizacao)} />
        {e.dataRealizacao && <p className="erro-campo">{e.dataRealizacao}</p>}
      </div>

      <div className={`campo ${e.modalidade ? "invalido" : ""}`}>
        <label htmlFor="curso-modalidade">Modalidade</label>
        <select id="curso-modalidade" name="modalidade" defaultValue="">
          <option value="" disabled>Selecione</option>
          <option value="PRESENCIAL">Presencial</option>
          <option value="ONLINE">Online</option>
          <option value="AMBOS">Ambos</option>
        </select>
        {e.modalidade && <p className="erro-campo">{e.modalidade}</p>}
      </div>

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Registrar curso"}
      </button>
    </form>
  );
}
