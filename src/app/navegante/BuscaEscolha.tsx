"use client";

import { useEffect, useState, useTransition, type KeyboardEvent } from "react";
import type { ItemBusca } from "./actions";

type Props = {
  id: string;
  rotulo: string;
  placeholder: string;
  ajuda: string;
  recomendados: ItemBusca[];
  buscar: (termo: string) => Promise<ItemBusca[]>;
  escolher: (formData: FormData) => Promise<void>;
  campo: "vagaId" | "cursoId";
  vazio: string;
};

const ESPERA_MS = 250;

export default function BuscaEscolha({ id, rotulo, placeholder, ajuda, recomendados, buscar, escolher, campo, vazio }: Props) {
  const [termo, setTermo] = useState("");
  const [itens, setItens] = useState<ItemBusca[]>(recomendados);
  const [destaque, setDestaque] = useState(0);
  const [buscando, iniciarBusca] = useTransition();
  const [escolhendo, iniciarEscolha] = useTransition();

  // Sem termo: mostra os recomendados. Com termo: busca enquanto digita.
  useEffect(() => {
    const busca = termo.trim();
    if (busca.length < 2) {
      setItens(recomendados);
      setDestaque(0);
      return;
    }
    const timer = setTimeout(() => {
      iniciarBusca(async () => {
        setItens(await buscar(busca));
        setDestaque(0);
      });
    }, ESPERA_MS);
    return () => clearTimeout(timer);
  }, [termo, recomendados, buscar]);

  function escolhendoItem(item: ItemBusca) {
    if (item.escolhido) return;
    const dados = new FormData();
    dados.set(campo, item.id);
    iniciarEscolha(async () => {
      await escolher(dados);
      setTermo("");
    });
  }

  function aoPressionarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" && itens.length > 0) {
      evento.preventDefault();
      setDestaque((atual) => (atual + 1) % itens.length);
    } else if (evento.key === "ArrowUp" && itens.length > 0) {
      evento.preventDefault();
      setDestaque((atual) => (atual - 1 + itens.length) % itens.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      const selecionado = itens[destaque];
      if (selecionado) escolhendoItem(selecionado);
    }
  }

  const semResultado = termo.trim().length >= 2 && !buscando && itens.length === 0;

  return (
    <div className="busca-escolha">
      <div className="campo">
        <label htmlFor={id}>{rotulo}</label>
        <input
          id={id}
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={itens.length > 0}
          aria-controls={`${id}-lista`}
          aria-activedescendant={itens.length > 0 ? `${id}-opcao-${destaque}` : undefined}
          placeholder={placeholder}
          value={termo}
          disabled={escolhendo}
          onChange={(evento) => setTermo(evento.target.value)}
          onKeyDown={aoPressionarTecla}
        />
        <span className="ajuda">{ajuda}</span>
      </div>

      {buscando && <p className="ajuda">Buscando…</p>}
      {escolhendo && <p className="ajuda">Salvando…</p>}

      {itens.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" aria-label={`Resultados: ${rotulo}`} className="lista">
          {itens.map((item, indice) => (
            <li
              key={item.id}
              id={`${id}-opcao-${indice}`}
              role="option"
              aria-selected={indice === destaque}
              className={indice === destaque ? "destacado" : undefined}
              onMouseEnter={() => setDestaque(indice)}
              onClick={() => escolhendoItem(item)}
            >
              <strong>{item.titulo}</strong>
              {typeof item.indice === "number" && <span className="tag">Índice {item.indice}</span>}
              {item.detalhe && <div className="ajuda">{item.detalhe}</div>}
              {item.escolhido && <span className="tag">Escolhida</span>}
            </li>
          ))}
        </ul>
      )}

      {itens.length === 0 && !buscando && termo.trim().length < 2 && <p className="vazio">{vazio}</p>}
      {semResultado && <p className="vazio">Nenhum resultado para &ldquo;{termo.trim()}&rdquo;.</p>}
    </div>
  );
}
