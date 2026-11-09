"use client";

import { useActionState } from "react";
import type { StatusPorto } from "@prisma/client";
import { alterarPorto, alterarPortoNoMapa } from "./actions";
import { rotuloTipoPorto, type PortoMapa } from "@/lib/mapa-portos";

export type PortoAdmin = PortoMapa & {
  status: StatusPorto;
  _count: { inscritos: number; vagas: number; cursos: number };
};

const SITUACAO_PORTO: Record<StatusPorto, { rotulo: string; operacao: "habilitar" | "desabilitar"; classe: string }> = {
  ATIVO: { rotulo: "Ativo", operacao: "desabilitar", classe: "ativo" },
  EM_ANALISE: { rotulo: "Em análise", operacao: "desabilitar", classe: "analise" },
  SUSPENSO: { rotulo: "Suspenso", operacao: "habilitar", classe: "inativo" },
  INATIVO: { rotulo: "Inativo", operacao: "habilitar", classe: "inativo" },
};

export default function LinhaPortoAdmin({ porto, mapa = false }: { porto: PortoAdmin; mapa?: boolean }) {
  const [resultado, acaoMapa, pendente] = useActionState(alterarPortoNoMapa, {});
  const situacao = SITUACAO_PORTO[porto.status];
  const acao = situacao.operacao === "habilitar" ? "Habilitar" : "Desabilitar";
  return <li className="admin-porto-linha">
    <span><strong>{porto.nome}</strong> · {mapa && <>{rotuloTipoPorto(porto.tipo)} · </>}{[porto.cidade, porto.uf].filter(Boolean).join(" / ") || "localidade não informada"} · {porto._count.inscritos} navegantes · {porto._count.vagas} vagas · </span>
    <span className="admin-porto-cursos-status"><span>{porto._count.cursos} cursos</span>
      {porto.aprovacaoPendente ? <span className="ajuda">Aguardando aprovação</span> : <form action={mapa ? acaoMapa : alterarPorto}>
        <input type="hidden" name="id" value={porto.id} />
        <input type="hidden" name="operacao" value={situacao.operacao} />
        <button type="submit" className={`admin-status-porto admin-status-porto-${situacao.classe}`} aria-label={`${situacao.rotulo}. ${acao} ${porto.nome}`} title={`${acao} Porto`} disabled={mapa && pendente}>
          {situacao.rotulo}
        </button>
      </form>}
    </span>
    {mapa && resultado.erro && <p className="erro-campo" role="alert">{resultado.erro}</p>}
    {mapa && resultado.sucesso && <span className="ajuda" role="status"> · {resultado.sucesso}</span>}
  </li>;
}
