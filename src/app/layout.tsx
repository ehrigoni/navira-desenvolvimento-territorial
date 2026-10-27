import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAVIRA",
  description: "Plataforma de desenvolvimento territorial",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="cabecalho">
          <Link href="/" className="marca">
            NAVIRA
          </Link>
          <nav className="links">
            <Link href="/entrar">Entrar</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
