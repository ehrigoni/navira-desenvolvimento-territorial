import Link from "next/link";

export default function Entrada() {
  return (
    <main className="conteudo">
      <h1>Bem-vindo ao NAVIRA</h1>
      <p className="subtitulo">Quem é você nesta jornada?</p>
      <div className="grade-escolha">
        <Link href="/cadastrar?papel=NAVEGANTE" className="cartao escolha">
          <h3>Navegante</h3>
          <p>Encontre vagas, cursos e os portos da sua região.</p>
        </Link>
        <Link href="/cadastrar?papel=PORTO" className="cartao escolha porto">
          <h3>Porto</h3>
          <p>Igreja, escola, associação ou iniciativa com um território para cuidar.</p>
        </Link>
      </div>
      <p className="vazio" style={{ marginTop: "var(--espaco-lg)" }}>
        Já tem conta? <Link href="/entrar">Entrar</Link>
      </p>
    </main>
  );
}
