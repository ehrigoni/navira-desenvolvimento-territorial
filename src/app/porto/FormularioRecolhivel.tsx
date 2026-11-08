"use client";

import { useId, useState, type ReactNode } from "react";

export default function FormularioRecolhivel({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();

  return (
    <div className="formulario-recolhivel">
      {!aberto && (
        <button className="botao" type="button" aria-expanded={false} aria-controls={id} onClick={() => setAberto(true)}>
          {rotulo}
        </button>
      )}
      <div id={id} hidden={!aberto}>
        {children}
        <button className="botao secundario" type="button" aria-expanded={true} aria-controls={id} onClick={() => setAberto(false)}>Fechar formulário</button>
      </div>
    </div>
  );
}
