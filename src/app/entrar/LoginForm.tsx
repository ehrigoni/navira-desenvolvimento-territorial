"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { entrar, type EstadoLogin } from "./actions";
import { validarCredenciais } from "@/lib/validacao";

const inicial: EstadoLogin = {};

export default function LoginForm() {
  const [estado, acao, pendente] = useActionState(entrar, inicial);
  const [errosLocais, setErrosLocais] = useState<EstadoLogin["erros"]>({});

  // Valida no navegador antes de enviar: formato inválido não vai ao servidor.
  function validarAntesDeEnviar(e: FormEvent<HTMLFormElement>) {
    const dados = new FormData(e.currentTarget);
    const v = validarCredenciais(String(dados.get("identificador") ?? ""), String(dados.get("senha") ?? ""));
    setErrosLocais(v.erros);
    if (!v.valido) e.preventDefault();
  }

  const erros = { ...estado.erros, ...errosLocais };
  const identificadorAtual = estado.campos?.identificador;

  return (
    <form action={acao} onSubmit={validarAntesDeEnviar} className="formulario" noValidate>
      {estado.erro && <p className="alerta erro" role="alert">{estado.erro}</p>}

      <div className={`campo ${erros.identificador ? "invalido" : ""}`}>
        <label htmlFor="identificador">Celular, telefone ou e-mail</label>
        <input
          id="identificador"
          name="identificador"
          autoComplete="username"
          defaultValue={identificadorAtual}
          placeholder="(11) 91234-5678 ou nome@exemplo.com.br"
          aria-invalid={!!erros.identificador}
        />
        {erros.identificador && <p className="erro-campo">{erros.identificador}</p>}
      </div>

      <div className={`campo ${erros.senha ? "invalido" : ""}`}>
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" aria-invalid={!!erros.senha} />
        {erros.senha && <p className="erro-campo">{erros.senha}</p>}
      </div>

      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </button>

      <div className="links">
        <Link href="/esqueci-senha">Esqueci minha senha</Link>
        <Link href="/cadastrar">Cadastre-se</Link>
      </div>
    </form>
  );
}
