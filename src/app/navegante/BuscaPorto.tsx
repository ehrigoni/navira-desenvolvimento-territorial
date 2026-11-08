"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [cadastrando, setCadastrando] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  // Busca enquanto a pessoa digita (com atraso para não consultar a cada tecla).
  useEffect(() => {
    const busca = termo.trim();
    if (busca.length < 2) {
      setResultados([]);
      setBuscado(false);
      return;
    }
    const timer = setTimeout(() => {
      iniciarTransicao(async () => {
        setResultados(await buscarPortos(busca));
        setBuscado(true);
      });
    }, ESPERA_MS);
    return () => clearTimeout(timer);
  }, [termo]);

  const semResultado = buscado && !pendente && resultados.length === 0 && termo.trim().length >= 2;

  return (
    <div className="busca-porto">
      <div className="campo">
        <label htmlFor="busca-porto">Buscar porto ou entidade</label>
        <input
          id="busca-porto"
          type="search"
          autoComplete="off"
          placeholder="Digite o nome da igreja, escola ou associação"
          value={termo}
          onChange={(evento) => {
            setTermo(evento.target.value);
            setCadastrando(false);
          }}
        />
        <span className="ajuda">Os resultados aparecem enquanto você digita. Escolha o seu porto para se vincular a ele.</span>
      </div>

      {pendente && <p className="ajuda">Buscando…</p>}

      {resultados.length > 0 && (
        <ul className="lista" aria-label="Resultados da busca">
          {resultados.map((porto) => (
            <li key={porto.id}>
              <strong>{porto.nome}</strong>{" "}
              <span className="ajuda">
                · {ROTULO_TIPO[porto.tipo ?? ""] ?? "porto"} · {porto.cidade ?? "—"}/{porto.uf ?? "—"}
                {porto.cep ? ` · CEP ${porto.cep}` : ""}
              </span>
              {porto.vinculado ? (
                <span className="tag">Já vinculado</span>
              ) : (
                <form action={vincularPorto}>
                  <input type="hidden" name="portoId" value={porto.id} />
                  <button className="botao secundario" type="submit">Sou deste porto</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {semResultado && !cadastrando && (
        <div>
          <p className="vazio">Nenhum porto encontrado para &ldquo;{termo.trim()}&rdquo;.</p>
          <button className="botao" type="button" onClick={() => setCadastrando(true)}>
            Cadastrar &ldquo;{termo.trim()}&rdquo; como novo porto
          </button>
        </div>
      )}

      {cadastrando && <FormularioPorto nomeInicial={termo.trim()} />}
    </div>
  );
}
