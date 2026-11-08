"use client";

import { useEffect, useState, useTransition, type KeyboardEvent } from "react";
import { adicionarBeneficiario, buscarPortosBeneficiarios, type PortoBeneficiarioEncontrado } from "./actions";

export default function BuscaBeneficiario({ selecionados }: { selecionados: string[] }) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<PortoBeneficiarioEncontrado[]>([]);
  const [destaque, setDestaque] = useState(0);
  const [buscado, setBuscado] = useState(false);
  const [erro, setErro] = useState("");
  const [buscando, iniciarBusca] = useTransition();
  const [salvando, iniciarSalvamento] = useTransition();

  useEffect(() => {
    const busca = termo.trim();
    let cancelada = false;
    if (busca.length < 2) return;
    const timer = setTimeout(() => {
      iniciarBusca(async () => {
        try {
          const encontrados = await buscarPortosBeneficiarios(busca);
          if (!cancelada) {
            setResultados(encontrados);
            setDestaque(0);
            setBuscado(true);
            setErro("");
          }
        } catch (e) {
          console.error("[porto] falha ao buscar beneficiários", e);
          if (!cancelada) {
            setResultados([]);
            setBuscado(false);
            setErro("Não foi possível buscar portos. Tente novamente.");
          }
        }
      });
    }, 250);
    return () => { cancelada = true; clearTimeout(timer); };
  }, [termo]);

  function adicionar(item: PortoBeneficiarioEncontrado) {
    if (salvando || selecionados.includes(item.id)) return;
    iniciarSalvamento(async () => {
      try {
        const resultado = await adicionarBeneficiario(item.id);
        if (resultado.erro) {
          setErro(resultado.erro);
          return;
        }
        setTermo("");
        setResultados([]);
        setBuscado(false);
        setErro("");
      } catch (e) {
        console.error("[porto] falha ao adicionar beneficiário", e);
        setErro("Não foi possível adicionar o porto. Tente novamente.");
      }
    });
  }

  function aoPressionarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" && resultados.length) {
      evento.preventDefault();
      setDestaque((atual) => (atual + 1) % resultados.length);
    } else if (evento.key === "ArrowUp" && resultados.length) {
      evento.preventDefault();
      setDestaque((atual) => (atual - 1 + resultados.length) % resultados.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (resultados[destaque] && !buscando) adicionar(resultados[destaque]);
    }
  }

  return (
    <div className="busca-porto">
      <div className="campo">
        <label htmlFor="busca-beneficiario">Buscar porto a beneficiar</label>
        <input id="busca-beneficiario" type="search" autoComplete="off" role="combobox"
          aria-expanded={resultados.length > 0} aria-controls="resultados-beneficiario"
          aria-activedescendant={resultados.length ? `beneficiario-opcao-${destaque}` : undefined}
          placeholder="Digite o nome do porto" value={termo} disabled={salvando}
          onChange={(evento) => {
            setTermo(evento.target.value);
            setResultados([]);
            setBuscado(false);
            setErro("");
          }}
          onKeyDown={aoPressionarTecla}
        />
        <span className="ajuda">Digite ao menos 2 caracteres e use as setas e Enter para adicionar um porto à lista.</span>
      </div>
      {buscando && <p className="ajuda" role="status">Buscando…</p>}
      {salvando && <p className="ajuda" role="status">Salvando…</p>}
      {erro && <p className="alerta erro" role="alert">{erro}</p>}
      {resultados.length > 0 && (
        <ul id="resultados-beneficiario" role="listbox" aria-label="Portos encontrados" className="lista">
          {resultados.map((item, indice) => (
            <li key={item.id} id={`beneficiario-opcao-${indice}`} role="option"
              aria-selected={indice === destaque} className={indice === destaque ? "destacado" : undefined}
              onMouseEnter={() => setDestaque(indice)} onClick={() => adicionar(item)}>
              <strong>{item.nome}</strong>{" "}
              <span className="ajuda">· {item.cidade ?? "—"}/{item.uf ?? "—"}{item.cep ? ` · CEP ${item.cep}` : ""}</span>
              {selecionados.includes(item.id) && <span className="tag">Já adicionado</span>}
            </li>
          ))}
        </ul>
      )}
      {buscado && !buscando && resultados.length === 0 && <p className="vazio">Nenhum porto encontrado.</p>}
    </div>
  );
}
