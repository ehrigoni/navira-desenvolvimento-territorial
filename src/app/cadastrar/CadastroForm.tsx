"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { cadastrar, type EstadoCadastro } from "./actions";

const inicial: EstadoCadastro = {};

export default function CadastroForm({ papelInicial }: { papelInicial: "NAVEGANTE" | "PORTO" }) {
  const [estado, acao, pendente] = useActionState(cadastrar, inicial);
  const [papel, setPapel] = useState<"NAVEGANTE" | "PORTO">(papelInicial);
  const c = estado.campos ?? {};
  const e = estado.erros ?? {};

  return (
    <form action={acao} className="formulario" noValidate>
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}

      <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, color: "var(--azul)", fontSize: "0.95rem", marginBottom: 6 }}>Você é</legend>
        <div className="opcoes">
          <label>
            <input type="radio" name="papel" value="NAVEGANTE" checked={papel === "NAVEGANTE"} onChange={() => setPapel("NAVEGANTE")} />
            Navegante
          </label>
          <label>
            <input type="radio" name="papel" value="PORTO" checked={papel === "PORTO"} onChange={() => setPapel("PORTO")} />
            Porto
          </label>
        </div>
        {e.papel && <p className="erro-campo">{e.papel}</p>}
      </fieldset>

      <div className={`campo ${e.nome ? "invalido" : ""}`}>
        <label htmlFor="nome">{papel === "PORTO" ? "Nome do responsável" : "Seu nome"}</label>
        <input id="nome" name="nome" autoComplete="name" defaultValue={c.nome} />
        {e.nome && <p className="erro-campo">{e.nome}</p>}
      </div>

      <div className={`campo ${e.identificador ? "invalido" : ""}`}>
        <label htmlFor="identificador">Celular, telefone ou e-mail</label>
        <input id="identificador" name="identificador" autoComplete="username" defaultValue={c.identificador} placeholder="(11) 91234-5678 ou nome@exemplo.com.br" />
        {e.identificador && <p className="erro-campo">{e.identificador}</p>}
      </div>

      <div className={`campo ${e.senha ? "invalido" : ""}`}>
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="new-password" />
        <span className="ajuda">De 8 a 72 caracteres.</span>
        {e.senha && <p className="erro-campo">{e.senha}</p>}
      </div>

      {papel === "PORTO" && (
        <>
          <div className={`campo ${e.nomePorto ? "invalido" : ""}`}>
            <label htmlFor="nomePorto">Nome do porto</label>
            <input id="nomePorto" name="nomePorto" defaultValue={c.nomePorto} placeholder="Ex.: Associação de Moradores Vila X" />
            {e.nomePorto && <p className="erro-campo">{e.nomePorto}</p>}
          </div>

          <div className="campo">
            <label htmlFor="tipo">Tipo</label>
            <select id="tipo" name="tipo" defaultValue={c.tipo || "OUTRO"}>
              <option value="IGREJA">Igreja</option>
              <option value="ESCOLA">Escola</option>
              <option value="ASSOCIACAO">Associação</option>
              <option value="INICIATIVA">Iniciativa</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
        </>
      )}

      <div className={`campo ${e.cep ? "invalido" : ""}`}>
        <label htmlFor="cep">CEP {papel === "NAVEGANTE" && <span className="ajuda">(opcional)</span>}</label>
        <input id="cep" name="cep" inputMode="numeric" autoComplete="postal-code" defaultValue={c.cep} placeholder="90000-000" />
        {e.cep && <p className="erro-campo">{e.cep}</p>}
      </div>

      {papel === "PORTO" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 96px", gap: "var(--espaco-md)" }}>
          <div className={`campo ${e.cidade ? "invalido" : ""}`}>
            <label htmlFor="cidade">Cidade</label>
            <input id="cidade" name="cidade" defaultValue={c.cidade} />
            {e.cidade && <p className="erro-campo">{e.cidade}</p>}
          </div>
          <div className={`campo ${e.uf ? "invalido" : ""}`}>
            <label htmlFor="uf">UF</label>
            <input id="uf" name="uf" maxLength={2} defaultValue={c.uf} />
            {e.uf && <p className="erro-campo">{e.uf}</p>}
          </div>
        </div>
      )}

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Criando conta..." : "Criar conta"}
      </button>

      <p className="vazio" style={{ margin: 0 }}>
        Já tem conta? <Link href="/entrar">Entrar</Link>
      </p>
    </form>
  );
}
