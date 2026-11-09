"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { PainelImpacto, type DadosImpacto } from "../porto/AbasPainelPorto";
import MapaPortos from "./MapaPortos";
import type { PortoAdmin } from "./LinhaPortoAdmin";

const ABAS = [
  { id: "gestao", nome: "Gestão", classe: "gestao" },
  { id: "impacto", nome: "Impacto NAVIRA", classe: "impacto" },
  { id: "mapa", nome: "Mapa de atuação dos Portos", classe: "empresas" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

export default function AbasPainelAdmin({ children, dados, portos }: { children: ReactNode; dados: DadosImpacto; portos: PortoAdmin[] }) {
  const [aba, setAba] = useState<Aba>("gestao");
  function navegar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    const indice = ABAS.findIndex((item) => item.id === aba);
    const proxima = ABAS[(indice + (evento.key === "ArrowRight" ? 1 : -1) + ABAS.length) % ABAS.length].id;
    setAba(proxima);
    evento.currentTarget.querySelector<HTMLButtonElement>(`#aba-admin-${proxima}`)?.focus();
  }
  return <div className="abas-painel-porto">
    <div className="abas-painel-lista" role="tablist" aria-label="Seções da administração" onKeyDown={navegar}>
      {ABAS.map((item) => <button key={item.id} id={`aba-admin-${item.id}`} className={`aba-painel-porto aba-painel-porto-${item.classe}`} type="button" role="tab" aria-selected={aba === item.id} aria-controls={`painel-admin-${item.id}`} tabIndex={aba === item.id ? 0 : -1} onClick={() => setAba(item.id)}>{item.nome}</button>)}
    </div>
    <div id="painel-admin-gestao" role="tabpanel" aria-labelledby="aba-admin-gestao" hidden={aba !== "gestao"}>{children}</div>
    <div id="painel-admin-impacto" role="tabpanel" aria-labelledby="aba-admin-impacto" hidden={aba !== "impacto"}><PainelImpacto dados={dados} detalharIndices /></div>
    <div id="painel-admin-mapa" role="tabpanel" aria-labelledby="aba-admin-mapa" hidden={aba !== "mapa"}><MapaPortos portos={portos} /></div>
  </div>;
}
