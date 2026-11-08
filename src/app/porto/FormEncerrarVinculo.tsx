"use client";

import { useActionState } from "react";
import { encerrarVinculoCandidato, type EstadoAcao } from "./actions";

export default function FormEncerrarVinculo({ contratacaoId }: { contratacaoId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoAcao, FormData>(encerrarVinculoCandidato, {});
  return (
    <form action={acao} className="formulario">
      <input type="hidden" name="contratacaoId" value={contratacaoId} />
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="alerta sucesso" role="status">{estado.sucesso}</p>}
      <div className="campo">
        <label htmlFor={`motivo-${contratacaoId}`}>Motivo do não sucesso (opcional)</label>
        <textarea id={`motivo-${contratacaoId}`} name="motivo" maxLength={1000} placeholder="Fit cultural, distância, capacitação…" />
      </div>
      <p className="ajuda">O vínculo será encerrado, sem ressarcimento da cota. O candidato voltará a ficar disponível e o tempo de turnover será visível por três meses.</p>
      <button className="botao secundario" type="submit" disabled={pendente}>{pendente ? "Encerrando..." : "Confirmar encerramento sem ressarcimento"}</button>
    </form>
  );
}
