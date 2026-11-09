import { Prisma } from "@prisma/client";
import { formatarQuantidade } from "@/lib/colaboracoes";
import { FormContribuicao, FormDecisao, FormMeta } from "./FormulariosColaboracao";

type Contribuicao = {
  id: string;
  quantidade: Prisma.Decimal;
  status: string;
  criadaEm: Date;
  portoId: string | null;
  naveganteId: string | null;
  porto: { nome: string } | null;
  navegante: { nomeSocial: string | null; usuario: { nome: string }; Contratacao: { id: string }[] } | null;
};
type Meta = { id: string; tipo: string; unidade: string; meta: Prisma.Decimal; contribuicoes: Contribuicao[] };

export default function MetasColaboracao({ metas, iniciativaId, proprietario = false, aberta = true, papel, apoiadorId }: {
  metas: Meta[];
  iniciativaId: string;
  proprietario?: boolean;
  aberta?: boolean;
  papel: "PORTO" | "NAVEGANTE";
  apoiadorId?: string;
}) {
  return <div className="metas-colaboracao">
    <h4>Colaborações e metas</h4>
    {!metas.length && <p className="ajuda">Nenhuma meta cadastrada.</p>}
    {metas.map((meta) => {
      const confirmado = meta.contribuicoes.filter((c) => c.status === "CONFIRMADA").reduce((total, c) => total.plus(c.quantidade), new Prisma.Decimal(0));
      return <div className="meta-colaboracao" key={meta.id}>
        <strong>{meta.tipo}</strong>
        <p>{formatarQuantidade(confirmado)} de {formatarQuantidade(meta.meta)} {meta.unidade} confirmados</p>
        {proprietario && meta.contribuicoes.map((c) => {
          const nome = c.porto?.nome ?? (c.navegante && c.navegante.Contratacao.length === 0 ? (c.navegante.nomeSocial ?? c.navegante.usuario.nome).trim().split(/\s+/)[0] : "Navegante");
          return <div key={c.id}>
            <p>{nome} declarou {formatarQuantidade(c.quantidade)} {meta.unidade} em {c.criadaEm.toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {c.status === "CONFIRMADA" ? "confirmada" : c.status === "RECUSADA" ? "recusada" : "aguardando confirmação"}</p>
            {c.status === "PENDENTE" && <FormDecisao id={c.id} />}
          </div>;
        })}
        {!proprietario && meta.contribuicoes.filter((c) => papel === "PORTO" ? c.portoId === apoiadorId : c.naveganteId === apoiadorId).map((c) =>
          <p className="ajuda" key={c.id}>Sua declaração: {formatarQuantidade(c.quantidade)} {meta.unidade} · {c.status === "CONFIRMADA" ? "confirmada" : c.status === "RECUSADA" ? "recusada" : "aguardando confirmação"}</p>
        )}
        {!proprietario && aberta && <FormContribuicao metaId={meta.id} papel={papel} unidade={meta.unidade} />}
      </div>;
    })}
    {proprietario && aberta && <details><summary>Adicionar meta de colaboração</summary><FormMeta iniciativaId={iniciativaId} /></details>}
    {!proprietario && metas.length > 0 && <p className="ajuda">Ao colaborar, você passa a apoiar a iniciativa. Somente contribuições confirmadas pelo Porto contam para a meta. Declarações não realizam pagamento nem comprovam entrega.</p>}
  </div>;
}
