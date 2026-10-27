"use client";

import Link from "next/link";
import { useActionState } from "react";
import { recuperarSenha, type EstadoRecuperacao } from "./actions";

const inicial: EstadoRecuperacao = {};

export default function RecuperarSenhaForm() {
  const [estado, acao, pendente] = useActionState(recuperarSenha, inicial);
  const e = estado.erros ?? {};

  if (estado.sucesso) {
    return (
      <div className="formulario">
        <p className="alerta sucesso" role="status">{estado.sucesso}</p>
        <Link href="/entrar">Voltar para o login</Link>
      </div>
    );
  }

  return (
    <form action={acao} className="formulario" noValidate>
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}

      <div className={`campo ${e.identificador ? "invalido" : ""}`}>
        <label htmlFor="identificador">E-mail ou telefone</label>
        <input id="identificador" name="identificador" autoComplete="username" />
        {e.identificador && <p className="erro-campo">{e.identificador}</p>}
      </div>

      <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, color: "var(--azul)", fontSize: "0.95rem", marginBottom: 6 }}>Receber por</legend>
        <div className="opcoes">
          <label>
            <input type="radio" name="metodo" value="email" defaultChecked /> E-mail (link)
          </label>
          <label>
            <input type="radio" name="metodo" value="whatsapp" /> WhatsApp (código)
          </label>
        </div>
        {e.metodo && <p className="erro-campo">{e.metodo}</p>}
      </fieldset>

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Enviando..." : "Recuperar senha"}
      </button>
      <Link href="/entrar">Voltar para o login</Link>
    </form>
  );
}
