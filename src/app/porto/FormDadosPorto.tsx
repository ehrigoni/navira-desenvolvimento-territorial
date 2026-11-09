"use client";

import { useActionState, useEffect, useState } from "react";
import { atualizarDadosPorto, consultarCnae, type EstadoAcao } from "./actions";

type DadosPorto = {
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
  cnae: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

const inicial: EstadoAcao = {};

export default function FormDadosPorto({ porto }: { porto: DadosPorto }) {
  const [estado, acao, pendente] = useActionState(atualizarDadosPorto, inicial);
  const [valores, setValores] = useState(porto);
  const [descricao, setDescricao] = useState("");
  const [situacaoCnae, setSituacaoCnae] = useState<"vazio" | "buscando" | "encontrado" | "nao-encontrado" | "erro">("vazio");
  const erros = estado.erros ?? {};
  const cnae = valores.cnae ?? "";
  useEffect(() => {
    let cancelado = false;
    if (!/^[\d./-]+$/.test(cnae) || cnae.replace(/\D/g, "").length !== 7) return;
    const timer = setTimeout(() => {
      setSituacaoCnae("buscando");
      consultarCnae(cnae).then((resultado) => {
        if (cancelado) return;
        setDescricao(resultado ?? "");
        setSituacaoCnae(resultado ? "encontrado" : "nao-encontrado");
      }).catch((erro: unknown) => {
        console.error("[porto] falha ao consultar CNAE", erro);
        if (!cancelado) {
          setDescricao("");
          setSituacaoCnae("erro");
        }
      });
    }, 250);
    return () => { cancelado = true; clearTimeout(timer); };
  }, [cnae]);

  const campos = [
    { nome: "nome", rotulo: "Nome do porto", obrigatorio: true },
    { nome: "razaoSocial", rotulo: "Razão social (opcional)" },
    { nome: "cnpj", rotulo: "CNPJ (opcional)" },
    { nome: "cnae", rotulo: "CNAE (opcional)" },
    { nome: "cep", rotulo: "CEP", obrigatorio: true },
    { nome: "logradouro", rotulo: "Logradouro" },
    { nome: "numero", rotulo: "Número" },
    { nome: "complemento", rotulo: "Complemento" },
    { nome: "bairro", rotulo: "Bairro" },
    { nome: "cidade", rotulo: "Cidade", obrigatorio: true },
    { nome: "uf", rotulo: "UF", obrigatorio: true },
  ] as const;

  return (
    <form action={acao} className="formulario">
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="alerta sucesso" role="status">{estado.sucesso}</p>}
      <div className="grade-dados-porto">
        {campos.map((campo) => (
          <div className={`campo ${erros[campo.nome] ? "invalido" : ""}`} key={campo.nome}>
            <label htmlFor={`dados-porto-${campo.nome}`}>{campo.rotulo}</label>
            <input
              id={`dados-porto-${campo.nome}`}
              name={campo.nome}
              value={valores[campo.nome] ?? ""}
              onChange={(evento) => {
                if (campo.nome === "cnae") {
                  setDescricao("");
                  setSituacaoCnae("vazio");
                }
                setValores((atual) => ({ ...atual, [campo.nome]: evento.target.value }));
              }}
              required={"obrigatorio" in campo && campo.obrigatorio}
              maxLength={campo.nome === "uf" ? 2 : undefined}
              aria-invalid={!!erros[campo.nome]}
              aria-describedby={erros[campo.nome] ? `erro-dados-porto-${campo.nome}` : undefined}
            />
            {erros[campo.nome] && <p className="erro-campo" id={`erro-dados-porto-${campo.nome}`}>{erros[campo.nome]}</p>}
            {campo.nome === "cnae" && (
              <>
                <label htmlFor="dados-porto-descricao-cnae">Descrição do CNAE</label>
                <textarea id="dados-porto-descricao-cnae" value={descricao} readOnly rows={3} aria-describedby="dados-porto-cnae-status" />
                <span className="ajuda" id="dados-porto-cnae-status" role="status">
                  {situacaoCnae === "buscando" ? "Consultando CNAE..."
                    : situacaoCnae === "nao-encontrado" ? "CNAE não encontrado no catálogo CNAE 2.3."
                    : situacaoCnae === "erro" ? "Não foi possível consultar o CNAE. Altere o código para tentar novamente."
                    : situacaoCnae === "encontrado" ? "Descrição do catálogo CNAE 2.3."
                    : "Informe os 7 dígitos do CNAE para consultar a descrição."}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      <button className="botao" type="submit" disabled={pendente}>{pendente ? "Salvando..." : "Salvar dados do porto"}</button>
    </form>
  );
}
