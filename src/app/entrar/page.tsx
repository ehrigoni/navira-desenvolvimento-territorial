import LoginForm from "./LoginForm";

export default async function PaginaEntrar({ searchParams }: { searchParams: Promise<{ mensagem?: string }> }) {
  const { mensagem } = await searchParams;
  return (
    <main className="central">
      <h1>Entrar</h1>
      <p className="subtitulo">Use seu celular, telefone ou e-mail.</p>
      {mensagem === "senha-redefinida" && (
        <p className="alerta sucesso" role="status" style={{ marginBottom: "var(--espaco-md)" }}>
          Senha alterada com sucesso! Faça login com sua nova senha.
        </p>
      )}
      <div className="cartao">
        <LoginForm />
      </div>
    </main>
  );
}
