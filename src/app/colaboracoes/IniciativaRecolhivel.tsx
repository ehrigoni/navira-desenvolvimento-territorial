"use client";

import { useId, useState, type ReactNode } from "react";

export default function IniciativaRecolhivel({ titulo, categoria, children }: {
  titulo: string;
  categoria: string;
  children: ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const id = useId();

  return <>
    <div className="iniciativa-cabecalho">
      <strong>{titulo}</strong>
      <button
        className="tag iniciativa-expandir"
        type="button"
        aria-expanded={aberta}
        aria-controls={id}
        aria-label={`${categoria}: ${aberta ? "ocultar" : "ver"} necessidades e metas de ${titulo}`}
        onClick={() => setAberta(!aberta)}
      >{categoria}</button>
    </div>
    <div id={id} hidden={!aberta}>{children}</div>
  </>;
}
