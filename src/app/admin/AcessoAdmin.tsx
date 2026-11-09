"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { cadastrarAdmin, entrarAdmin, type EstadoAcessoAdmin } from "./acesso-actions";
import IdentificadorInput from "../IdentificadorInput";

const inicial: EstadoAcessoAdmin = {};

export default function AcessoAdmin() {
  const [cadastro, setCadastro] = useState(false);
  const [login, acaoLogin, loginPendente] = useActionState(entrarAdmin, inicial);
  const [registro, acaoCadastro, cadastroPendente] = useActionState(cadastrarAdmin, inicial);
  return <main className="central">
    <h1>Acesso administrativo</h1>
    <p className="subtitulo">Entre na administração NAVIRA ou solicite seu cadastro.</p>
    <div className="cartao">
      <div className="admin-acoes" aria-label="Opções de acesso">
        <button type="button" className={`botao${cadastro ? " secundario" : ""}`} aria-pressed={!cadastro} onClick={() => setCadastro(false)}>Entrar</button>
        <button type="button" className={`botao${cadastro ? "" : " secundario"}`} aria-pressed={cadastro} onClick={() => setCadastro(true)}>Cadastre-se</button>
      </div>
      {cadastro ? <form action={acaoCadastro} className="formulario">
        {registro.erro && <p className="alerta erro" role="alert">{registro.erro}</p>}
        {registro.sucesso && <p className="alerta sucesso" role="status">{registro.sucesso}</p>}
        <p>Seu cadastro será analisado por um administrador. O acesso será liberado após a aprovação.</p>
        <div className="campo"><label htmlFor="admin-nome">Nome</label><input id="admin-nome" name="nome" autoComplete="name" maxLength={120} required /></div>
        <div className="campo"><label htmlFor="admin-cadastro-login">Telefone ou e-mail</label><IdentificadorInput id="admin-cadastro-login" name="identificador" autoComplete="username" required /></div>
        <div className="campo"><label htmlFor="admin-cadastro-senha">Senha</label><input id="admin-cadastro-senha" name="senha" type="password" autoComplete="new-password" minLength={8} required /><span className="ajuda">Mínimo de 8 caracteres e máximo de 72 bytes.</span></div>
        <div className="campo"><label htmlFor="admin-confirmacao">Confirme a senha</label><input id="admin-confirmacao" name="confirmacao" type="password" autoComplete="new-password" minLength={8} required /></div>
        <button className="botao" disabled={cadastroPendente}>{cadastroPendente ? "Enviando..." : "Solicitar cadastro"}</button>
      </form> : <form action={acaoLogin} className="formulario">
        {login.erro && <p className="alerta erro" role="alert">{login.erro}</p>}
        {registro.sucesso && <p className="alerta sucesso" role="status">{registro.sucesso}</p>}
        <div className="campo"><label htmlFor="admin-login">Telefone ou e-mail</label><IdentificadorInput id="admin-login" name="identificador" autoComplete="username" required /></div>
        <div className="campo"><label htmlFor="admin-senha">Senha</label><input id="admin-senha" name="senha" type="password" autoComplete="current-password" required /></div>
        <button className="botao" disabled={loginPendente}>{loginPendente ? "Entrando..." : "Entrar na administração"}</button>
      </form>}
    </div>
    <Link href="/">Voltar à página inicial</Link>
  </main>;
}
