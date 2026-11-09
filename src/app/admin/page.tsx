import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { lerSessao } from "@/lib/session";
import AcessoAdmin from "./AcessoAdmin";
import PainelAdmin from "./PainelAdmin";

export const metadata: Metadata = { title: "Administração | NAVIRA", referrer: "no-referrer" };

export default async function Admin({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const sessao = await lerSessao();
  if (sessao?.papel === "ADMIN") {
    const admin = await db.administrador.findUnique({ where: { id: sessao.sub }, select: { ativo: true, aprovacaoPendente: true, trocarSenha: true } });
    if (admin?.ativo && !admin.aprovacaoPendente) {
      if (admin.trocarSenha) redirect("/admin/senha");
      return <PainelAdmin searchParams={searchParams} />;
    }
  }
  return <AcessoAdmin />;
}
