import ResetarSenhaForm from "./ResetarSenhaForm";

export default async function PaginaResetarSenha({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="central">
      <h1>Nova senha</h1>
      <p className="subtitulo">Escolha uma senha nova para a sua conta.</p>
      <div className="cartao">
        {token ? (
          <ResetarSenhaForm token={token} />
        ) : (
          <p className="alerta erro">Link inválido. Solicite uma nova recuperação de senha.</p>
        )}
      </div>
    </main>
  );
}
