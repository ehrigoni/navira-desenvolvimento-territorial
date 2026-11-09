import type { Metadata } from "next";
import Link from "next/link";
import { obterSessaoAtiva } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAVIRA",
  description: "Plataforma de desenvolvimento territorial",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessaoAtiva();
  return (
    <html lang="pt-BR">
      <body>
        <header className="cabecalho">
          <Link href="/" className="marca">
            NAVIRA
          </Link>
          <nav className="links">
            {sessao ? <form action="/sair" method="post"><button type="submit" className="cabecalho-sair">Sair</button></form> : <Link href="/entrar">Entrar</Link>}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
