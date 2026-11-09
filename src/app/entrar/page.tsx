import LoginForm from "./LoginForm";

export default async function PaginaEntrar({ searchParams }: { searchParams: Promise<{ mensagem?: string }> }) {
  const { mensagem } = await searchParams;
  return (
    <main className="central">
      <h1>Entrar</h1>
      <p className="subtitulo">Use seu celular, telefone ou e-mail.</p>
      {mensagem === "senha-redefinida" && (
        <p className="alerta sucesso aviso-espacado" role="status">
          Senha alterada com sucesso! Faça login com sua nova senha.
        </p>
      )}
      {mensagem === "porto-em-analise" && <p className="alerta sucesso" role="status">Cadastro recebido. Seu Porto poderá entrar após a aprovação da administração.</p>}
      {mensagem === "porto-indisponivel" && <p className="alerta erro" role="alert">Este Porto está aguardando aprovação ou não está habilitado. Entre em contato com a administração.</p>}
      <div className="cartao">
        <LoginForm />
      </div>
    </main>
  );
}
