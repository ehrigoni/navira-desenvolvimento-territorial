export type IndicadorImpacto = {
  nome: string;
  peso?: string;
  descricao: string;
  dado?: "pessoasCadastradas";
};

export type IndiceImpacto = {
  sigla: string;
  nome: string;
  peso: string;
  descricao: string;
  detalhe: string;
  indicadores: IndicadorImpacto[];
};

export const INDICES_IMPACTO: IndiceImpacto[] = [
  {
    sigla: "IIP",
    nome: "Inclusão Produtiva",
    peso: "30%",
    descricao: "30% pessoas cadastradas · 35% acessadas · 35% contratadas.",
    detalhe: "A especificação também prevê recortes de gênero, raça, PCD, periferia e idade. Dados sensíveis não são exibidos nesta visão.",
    indicadores: [
      { nome: "Pessoas cadastradas", peso: "30%", descricao: "Navegantes registrados na plataforma.", dado: "pessoasCadastradas" },
      { nome: "Pessoas acessadas", peso: "35%", descricao: "Pessoas acessadas; o critério de acesso ainda não está definido para cálculo." },
      { nome: "Pessoas contratadas", peso: "35%", descricao: "Pessoas distintas contratadas; registros de contratações não são necessariamente pessoas distintas." },
      { nome: "Diversidade e equidade de contratação", descricao: "Recortes e proporções de contratação previstos na especificação dependem de critérios de agregação e proteção de dados sensíveis." },
    ],
  },
  {
    sigla: "IME",
    nome: "Mobilidade Econômica",
    peso: "35%",
    descricao: "40% evolução da renda · 35% inserção produtiva · 25% permanência econômica.",
    detalhe: "O documento também cita evolução da escolaridade, sem definir um peso para esse componente.",
    indicadores: [
      { nome: "Evolução da renda", peso: "40%", descricao: "Variação positiva da renda bruta entre períodos comparáveis." },
      { nome: "Inserção produtiva", peso: "35%", descricao: "Passagem de desemprego para emprego." },
      { nome: "Permanência econômica", peso: "25%", descricao: "Continuidade ou mudança de emprego e promoções, incluindo o prazo até a promoção." },
      { nome: "Evolução da escolaridade", descricao: "Aumento do nível de escolaridade; a especificação não define peso para esse indicador." },
    ],
  },
  {
    sigla: "IDT",
    nome: "Desenvolvimento Territorial",
    peso: "20%",
    descricao: "30% cobertura territorial · 40% conexão local · 20% retenção territorial.",
    detalhe: "A especificação detalha 90% dos componentes do índice; os 10% restantes não estão definidos.",
    indicadores: [
      { nome: "Cobertura territorial", peso: "30%", descricao: "Municípios impactados divididos pelos municípios prioritários." },
      { nome: "Conexão local", peso: "40%", descricao: "Contratações locais divididas pelo total de contratações." },
      { nome: "Retenção territorial", peso: "20%", descricao: "Pessoas que permanecem atuando na região divididas pelo total de pessoas inseridas." },
      { nome: "Impacto territorial", descricao: "Evolução de vagas, renda, empresas participantes e cursos concluídos no município." },
      { nome: "Parceria estruturante", descricao: "Número de empresas que apadrinham Portos." },
      { nome: "Densidade de oportunidades", descricao: "Vagas geradas divididas pela população economicamente ativa local." },
    ],
  },
  {
    sigla: "IRES",
    nome: "Reputação Social",
    peso: "15%",
    descricao: "Considera remuneração, desenvolvimento profissional e oportunidades oferecidas.",
    detalhe: "A especificação descreve os indicadores, mas não define os pesos internos para calcular o índice.",
    indicadores: [
      { nome: "Remuneração ligada a contratações", descricao: "Valores de salários e benefícios decorrentes das contratações." },
      { nome: "Desenvolvimento profissional", descricao: "Despesas com capacitação e custeio de cursos." },
      { nome: "Vagas oferecidas atualmente", descricao: "Vagas abertas por meio do programa na rede de parceiros." },
      { nome: "Vagas totais oferecidas", descricao: "Vagas acumuladas desde o início da parceria entre a empresa e a NAVIRA." },
      { nome: "Economia gerada pela inclusão", descricao: "Soma dos valores financeiros associados à inclusão, incluindo auxílios das empresas." },
      { nome: "Criação de valor social", descricao: "Relação entre benefícios e custos investidos, incluindo custos de apadrinhamento." },
    ],
  },
];
