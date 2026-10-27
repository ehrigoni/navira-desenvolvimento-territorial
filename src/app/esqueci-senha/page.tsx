import RecuperarSenhaForm from "./RecuperarSenhaForm";

export default function PaginaEsqueciSenha() {
  return (
    <main className="central">
      <h1>Recuperar senha</h1>
      <p className="subtitulo">Vamos enviar instruções para você criar uma nova senha.</p>
      <div className="cartao">
        <RecuperarSenhaForm />
      </div>
    </main>
  );
}
