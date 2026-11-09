"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { INDICES_IMPACTO } from "@/lib/indices-impacto";

export type DadosImpacto = {
  pessoasCadastradas: number;
  pessoasAtivas: number;
  vagasPublicadas: number;
  vagasAtivas: number;
  contratacoesRegistradas: number;
  contratacoesAtivas: number;
  cursosConcluidos: number;
  parceriasApadrinhamento: number;
  municipioDestaque: { cidade: string; uf: string; vagasAtivas: number } | null;
};

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

export function PainelImpacto({ dados, detalharIndices = true }: { dados: DadosImpacto; detalharIndices?: boolean }) {
  const metricas = [
    { titulo: "Pessoas cadastradas", valor: formatarNumero(dados.pessoasCadastradas), detalhe: "Navegantes registrados na plataforma" },
    { titulo: "Pessoas ativas", valor: formatarNumero(dados.pessoasAtivas), detalhe: "Contas de Navegante ativas" },
    { titulo: "Vagas publicadas", valor: formatarNumero(dados.vagasPublicadas), detalhe: `${formatarNumero(dados.vagasAtivas)} vagas ativas no momento` },
    { titulo: "Contratações registradas", valor: formatarNumero(dados.contratacoesRegistradas), detalhe: `${formatarNumero(dados.contratacoesAtivas)} vínculos ativos` },
    { titulo: "Cursos concluídos", valor: formatarNumero(dados.cursosConcluidos), detalhe: "Registros no histórico de formação dos Navegantes" },
    { titulo: "Parcerias de apadrinhamento", valor: formatarNumero(dados.parceriasApadrinhamento), detalhe: "Relações com cotas de apoio" },
    {
      titulo: "Município com mais oportunidades",
      valor: dados.municipioDestaque ? `${dados.municipioDestaque.cidade}/${dados.municipioDestaque.uf}` : "Sem dados",
      detalhe: dados.municipioDestaque
        ? `${formatarNumero(dados.municipioDestaque.vagasAtivas)} vagas ativas`
        : "Nenhuma vaga ativa com município informado",
    },
  ];

  return (
      <>
        <section className="cartao painel-impacto painel-impacto-metricas">
          <h2>Navira em números</h2>
          <p className="ajuda">Indicadores agregados da rede NAVIRA, conforme os registros atuais da plataforma.</p>
          <div className="grade-metricas-impacto">
            {metricas.map((metrica) => (
              <article className="metrica-impacto" key={metrica.titulo}>
                <h3>{metrica.titulo}</h3>
                <p className="metrica-impacto-valor">{metrica.valor}</p>
                <p className="ajuda">{metrica.detalhe}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cartao painel-impacto painel-impacto-score">
          <h2>NAVIRA Impact Score</h2>
          <p>
            O score reúne quatro índices. A pontuação total ainda não é calculada: faltam definições de pesos e dados comparáveis para alguns componentes.
          </p>
          <div className="grade-indices-impacto">
            {INDICES_IMPACTO.map((indice) => (
              <article
                className={`indice-impacto${detalharIndices ? " indice-impacto-clicavel" : ""}`}
                key={indice.sigla}
                onClick={detalharIndices ? (evento) => {
                  if (evento.target instanceof Element && evento.target.closest("summary")) return;
                  if (window.getSelection()?.toString()) return;
                  const detalhes = evento.currentTarget.querySelector<HTMLDetailsElement>(".indice-impacto-expansivel");
                  if (detalhes) detalhes.open = !detalhes.open;
                } : undefined}
              >
                {detalharIndices ? <details className="indice-impacto-expansivel">
                  <summary>
                    <span className="indice-impacto-cabecalho">
                      <span className="indice-impacto-titulo"><strong>{indice.sigla}</strong> {indice.nome}</span>
                      <strong>{indice.peso}</strong>
                    </span>
                    <span className="indice-impacto-resumo">{indice.descricao}</span>
                    <span className="indice-impacto-acao">Indicadores <span aria-hidden="true">⌄</span></span>
                  </summary>
                  <p className="ajuda">{indice.detalhe}</p>
                  <ul className="indice-impacto-indicadores">
                    {indice.indicadores.map((indicador) => <li key={indicador.nome}>
                      <div><strong>{indicador.nome}</strong>{indicador.peso && <span>{indicador.peso} do índice</span>}</div>
                      <p>{indicador.descricao}</p>
                      <p className="indice-impacto-disponibilidade">{indicador.dado ? `${formatarNumero(dados[indicador.dado])} registros` : "Não disponível para cálculo"}</p>
                    </li>)}
                  </ul>
                </details> : <>
                  <div className="indice-impacto-cabecalho">
                    <h3><span>{indice.sigla}</span> {indice.nome}</h3>
                    <strong>{indice.peso}</strong>
                  </div>
                  <p>{indice.descricao}</p>
                  <p className="ajuda">{indice.detalhe}</p>
                </>}
              </article>
            ))}
          </div>
        </section>

        <section className="cartao painel-impacto painel-impacto-pendentes">
          <h2>Indicadores em preparação</h2>
          <ul className="lista lista-indicadores-pendentes">
            <li>
              <strong>Variação e evolução da renda</strong>
              <p className="ajuda">A renda é registrada em faixas, sem valores inicial e atual comparáveis para calcular aumento médio ou tempo para dobrar.</p>
            </li>
            <li>
              <strong>Renda por curso ou trilha</strong>
              <p className="ajuda">Ainda não há relação entre a conclusão de uma formação e a variação de renda de cada pessoa.</p>
            </li>
            <li>
              <strong>Equidade de contratação e conexões locais</strong>
              <p className="ajuda">Esses cálculos exigem critérios de agregação consistentes e respeito aos consentimentos e à proteção de dados pessoais sensíveis.</p>
            </li>
          </ul>
        </section>
      </>
  );
}

export default function AbasPainelPorto({
  children,
  dados,
  formularioDados,
  membros,
}: {
  children: ReactNode;
  dados: DadosImpacto;
  formularioDados: ReactNode;
  membros: ReactNode;
}) {
  const [aba, setAba] = useState<"gestao" | "impacto" | "empresas" | "membros">("gestao");

  function navegarAbas(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    const ordemAbas = ["gestao", "membros", "impacto", "empresas"] as const;
    const indiceAtual = ordemAbas.indexOf(aba);
    const deslocamento = evento.key === "ArrowRight" ? 1 : -1;
    const proximaAba = ordemAbas[(indiceAtual + deslocamento + ordemAbas.length) % ordemAbas.length];
    setAba(proximaAba);
    evento.currentTarget.querySelector<HTMLButtonElement>(`#aba-porto-${proximaAba}`)?.focus();
  }

  return (
    <div className="abas-painel-porto">
      <div className="abas-painel-lista" role="tablist" aria-label="Seções do painel do Porto" onKeyDown={navegarAbas}>
        <button id="aba-porto-gestao" className="aba-painel-porto aba-painel-porto-gestao" type="button" role="tab" aria-selected={aba === "gestao"} aria-controls="painel-porto-gestao" tabIndex={aba === "gestao" ? 0 : -1} onClick={() => setAba("gestao")}>Gestão do Porto</button>
        <button id="aba-porto-membros" className="aba-painel-porto aba-painel-porto-gestao" type="button" role="tab" aria-selected={aba === "membros"} aria-controls="painel-porto-membros" tabIndex={aba === "membros" ? 0 : -1} onClick={() => setAba("membros")}>Membros</button>
        <button id="aba-porto-impacto" className="aba-painel-porto aba-painel-porto-impacto" type="button" role="tab" aria-selected={aba === "impacto"} aria-controls="painel-porto-impacto" tabIndex={aba === "impacto" ? 0 : -1} onClick={() => setAba("impacto")}>Impacto NAVIRA</button>
        <button id="aba-porto-empresas" className="aba-painel-porto aba-painel-porto-empresas" type="button" role="tab" aria-selected={aba === "empresas"} aria-controls="painel-porto-empresas" tabIndex={aba === "empresas" ? 0 : -1} onClick={() => setAba("empresas")}>Dados do Porto</button>
      </div>
      <div id="painel-porto-gestao" role="tabpanel" aria-labelledby="aba-porto-gestao" hidden={aba !== "gestao"}>{children}</div>
      <div id="painel-porto-membros" role="tabpanel" aria-labelledby="aba-porto-membros" hidden={aba !== "membros"}>{membros}</div>
      <div id="painel-porto-impacto" role="tabpanel" aria-labelledby="aba-porto-impacto" hidden={aba !== "impacto"}><PainelImpacto dados={dados} /></div>
      <div id="painel-porto-empresas" role="tabpanel" aria-labelledby="aba-porto-empresas" hidden={aba !== "empresas"}>
        <section className="cartao painel-empresa painel-empresa-cadastro">
          <h2>Dados do Porto</h2>
          <p className="ajuda">Atualize a identificação e o endereço do seu porto. Razão social, CNPJ e CNAE são opcionais.</p>
          {formularioDados}
        </section>
      </div>
    </div>
  );
}
