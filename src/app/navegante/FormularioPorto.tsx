"use client";

import { useActionState, useEffect, useState } from "react";
import { adicionarPorto, type EstadoAcao } from "./actions";

const inicial: EstadoAcao = {};

type Endereco = { logradouro: string; bairro: string; cidade: string; uf: string };

/** Busca o endereço pelo CEP (ViaCEP). Falha silenciosa: a pessoa pode preencher à mão. */
async function buscarEndereco(cep: string): Promise<Endereco | null> {
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    if (dados.erro) return null;
    return { logradouro: dados.logradouro ?? "", bairro: dados.bairro ?? "", cidade: dados.localidade ?? "", uf: dados.uf ?? "" };
  } catch {
    return null;
  }
}

export default function FormularioPorto() {
  const [estado, acao, pendente] = useActionState(adicionarPorto, inicial);
  const [endereco, setEndereco] = useState<Endereco>({ logradouro: "", bairro: "", cidade: "", uf: "" });
  const [cep, setCep] = useState("");
  const e = estado.erros ?? {};

  // Após salvar com sucesso, limpa o endereço para o próximo porto.
  useEffect(() => {
    if (estado.sucesso) {
      setEndereco({ logradouro: "", bairro: "", cidade: "", uf: "" });
      setCep("");
    }
  }, [estado.sucesso]);

  async function aoMudarCep(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    setCep(digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : valor);
    if (digitos.length !== 8) return;
    const achado = await buscarEndereco(digitos);
    if (achado) setEndereco((atual) => ({
      logradouro: atual.logradouro || achado.logradouro,
      bairro: atual.bairro || achado.bairro,
      cidade: atual.cidade || achado.cidade,
      uf: atual.uf || achado.uf,
    }));
  }

  return (
    <form action={acao} className="formulario" noValidate>
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}
      {estado.sucesso && <p className="alerta" role="status">{estado.sucesso}</p>}

      <div className={`campo ${e.nome ? "invalido" : ""}`}>
        <label htmlFor="porto-nome">Nome do porto</label>
        <input id="porto-nome" name="nome" placeholder="Ex.: Associação de Moradores Vila X" />
        {e.nome && <p className="erro-campo">{e.nome}</p>}
      </div>

      <div className={`campo ${e.tipo ? "invalido" : ""}`}>
        <label htmlFor="porto-tipo">Tipo</label>
        <select id="porto-tipo" name="tipo" defaultValue="">
          <option value="" disabled>Selecione</option>
          <option value="IGREJA">Igreja</option>
          <option value="ESCOLA">Colégio ou escola</option>
          <option value="ASSOCIACAO">Associação</option>
          <option value="INICIATIVA">Iniciativa</option>
          <option value="OUTRO">Outro</option>
        </select>
        {e.tipo && <p className="erro-campo">{e.tipo}</p>}
      </div>

      <div className={`campo ${e.cep ? "invalido" : ""}`}>
        <label htmlFor="porto-cep">CEP</label>
        <input
          id="porto-cep"
          name="cep"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="90000-000"
          value={cep}
          onChange={(evento) => aoMudarCep(evento.target.value)}
        />
        <span className="ajuda">Ao digitar o CEP completo, rua, bairro e cidade são preenchidos.</span>
        {e.cep && <p className="erro-campo">{e.cep}</p>}
      </div>

      <div className={`campo ${e.logradouro ? "invalido" : ""}`}>
        <label htmlFor="porto-logradouro">Rua</label>
        <input id="porto-logradouro" name="logradouro" value={endereco.logradouro} onChange={(ev) => setEndereco({ ...endereco, logradouro: ev.target.value })} />
        {e.logradouro && <p className="erro-campo">{e.logradouro}</p>}
      </div>

      <div className={`campo ${e.numero ? "invalido" : ""}`}>
        <label htmlFor="porto-numero">Número</label>
        <input id="porto-numero" name="numero" />
        {e.numero && <p className="erro-campo">{e.numero}</p>}
      </div>

      <div className={`campo ${e.bairro ? "invalido" : ""}`}>
        <label htmlFor="porto-bairro">Bairro</label>
        <input id="porto-bairro" name="bairro" value={endereco.bairro} onChange={(ev) => setEndereco({ ...endereco, bairro: ev.target.value })} />
        {e.bairro && <p className="erro-campo">{e.bairro}</p>}
      </div>

      <div className={`campo ${e.cidade ? "invalido" : ""}`}>
        <label htmlFor="porto-cidade">Cidade</label>
        <input id="porto-cidade" name="cidade" value={endereco.cidade} onChange={(ev) => setEndereco({ ...endereco, cidade: ev.target.value })} />
        {e.cidade && <p className="erro-campo">{e.cidade}</p>}
      </div>

      <div className={`campo ${e.uf ? "invalido" : ""}`}>
        <label htmlFor="porto-uf">Estado (UF)</label>
        <input id="porto-uf" name="uf" maxLength={2} value={endereco.uf} onChange={(ev) => setEndereco({ ...endereco, uf: ev.target.value.toUpperCase() })} />
        {e.uf && <p className="erro-campo">{e.uf}</p>}
      </div>

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : "Confirmar porto"}
      </button>
    </form>
  );
}
