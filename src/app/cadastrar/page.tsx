import CadastroForm from "./CadastroForm";

export default async function PaginaCadastrar({ searchParams }: { searchParams: Promise<{ papel?: string }> }) {
  const { papel } = await searchParams;
  const papelInicial = papel === "PORTO" ? "PORTO" : "NAVEGANTE";
  return (
    <main className="central">
      <h1>Criar conta</h1>
      <p className="subtitulo">Leva menos de dois minutos.</p>
      <div className="cartao">
        <CadastroForm papelInicial={papelInicial} />
      </div>
    </main>
  );
}
