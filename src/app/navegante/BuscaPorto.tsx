"use client";

import { useEffect, useState, useTransition, type KeyboardEvent } from "react";
import { buscarPortos, vincularPorto, type PortoEncontrado } from "./actions";
import FormularioPorto from "./FormularioPorto";

const ROTULO_TIPO: Record<string, string> = {
  IGREJA: "igreja",
  ESCOLA: "escola",
  ASSOCIACAO: "associação",
  INICIATIVA: "iniciativa",
  OUTRO: "outro",
};

const ESPERA_MS = 250;

export default function BuscaPorto() {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<PortoEncontrado[]>([]);
  const [buscado, setBuscado] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const [cadastrando, setCadastrando] = useState(false);
  const [buscando, iniciarBusca] = useTransition();
  const [vinculando, iniciarVinculo] = useTransition();

  // Busca enquanto a pessoa digita (com atraso para não consultar a cada tecla).
  useEffect(() => {
    const busca = termo.trim();
    if (busca.length < 2) {
      setResultados([]);
      setBuscado(false);
      return;
    }
    const timer = setTimeout(() => {
      iniciarBusca(async () => {
        const encontrados = await buscarPortos(busca);
        setResultados(encontrados);
        setDestaque(0);
        setBuscado(true);
      });
    }, ESPERA_MS);
    return () => clearTimeout(timer);
  }, [termo]);

  function vincular(porto: PortoEncontrado) {
    if (porto.vinculado) return;
    const dados = new FormData();
    dados.set("portoId", porto.id);
    iniciarVinculo(async () => {
      await vincularPorto(dados);
      setTermo("");
      setResultados([]);
      setBuscado(false);
    });
  }

  function aoPressionarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" && resultados.length > 0) {
      evento.preventDefault();
      setDestaque((atual) => (atual + 1) % resultados.length);
    } else if (evento.key === "ArrowUp" && resultados.length > 0) {
      evento.preventDefault();
      setDestaque((atual) => (atual - 1 + resultados.length) % resultados.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      const selecionado = resultados[destaque];
      if (selecionado) vincular(selecionado);
      else if (semResultado) setCadastrando(true);
    }
  }

  const semResultado = buscado && !buscando && resultados.length === 0 && termo.trim().length >= 2;

  return (
    <div className="busca-porto">
      <div className="campo">
        <label htmlFor="busca-porto">Buscar porto ou entidade</label>
        <input
          id="busca-porto"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={resultados.length > 0}
          aria-controls="resultados-porto"
          aria-activedescendant={resultados.length > 0 ? `porto-opcao-${destaque}` : undefined}
          placeholder="Digite o nome da igreja, escola ou associação"
          value={termo}
          disabled={vinculando}
          onChange={(evento) => {
            setTermo(evento.target.value);
            setCadastrando(false);
          }}
          onKeyDown={aoPressionarTecla}
        />
        <span className="ajuda">
          Use as setas para escolher e Enter para se vincular. Sem resultado, Enter abre o cadastro de um novo porto.
        </span>
      </div>

      {buscando && <p className="ajuda">Buscando…</p>}
      {vinculando && <p className="ajuda">Vinculando…</p>}

      {resultados.length > 0 && (
        <ul id="resultados-porto" role="listbox" aria-label="Resultados da busca" className="lista">
          {resultados.map((porto, indice) => (
            <li
              key={porto.id}
              id={`porto-opcao-${indice}`}
              role="option"
              aria-selected={indice === destaque}
              className={indice === destaque ? "destacado" : undefined}
              onMouseEnter={() => setDestaque(indice)}
              onClick={() => vincular(porto)}
            >
              <strong>{porto.nome}</strong>{" "}
              <span className="ajuda">
                · {ROTULO_TIPO[porto.tipo ?? ""] ?? "porto"} · {porto.cidade ?? "—"}/{porto.uf ?? "—"}
                {porto.cep ? ` · CEP ${porto.cep}` : ""}
              </span>
              {porto.vinculado && <span className="tag">Já vinculado</span>}
            </li>
          ))}
        </ul>
      )}

      {semResultado && !cadastrando && (
        <p className="vazio">
          Nenhum porto encontrado para &ldquo;{termo.trim()}&rdquo;. Pressione Enter para cadastrá-lo como novo porto.
        </p>
      )}

      {cadastrando && <FormularioPorto nomeInicial={termo.trim()} />}
    </div>
  );
}
