import { exigirAdministradorParaTrocarSenha } from "@/lib/auth";
import { trocarSenha } from "../actions";

export default async function SenhaAdmin({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await exigirAdministradorParaTrocarSenha();
  const { erro } = await searchParams;
  return <main className="central">
    <h1>Alterar senha administrativa</h1>
    <p className="subtitulo">A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.</p>
    {erro && <p className="alerta erro" role="alert">Não foi possível alterar a senha. Confira a senha atual e a confirmação.</p>}
    <form action={trocarSenha} className="cartao formulario">
      <div className="campo"><label htmlFor="atual">Senha atual</label><input id="atual" name="atual" type="password" autoComplete="current-password" required /></div>
      <div className="campo"><label htmlFor="nova">Nova senha</label><input id="nova" name="nova" type="password" autoComplete="new-password" minLength={8} required /></div>
      <div className="campo"><label htmlFor="confirmacao">Confirme a nova senha</label><input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" minLength={8} required /></div>
      <button className="botao">Salvar senha</button>
    </form>
  </main>;
}
