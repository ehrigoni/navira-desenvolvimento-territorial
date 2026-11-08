export type TipoQuestao =
  | "texto"
  | "texto_longo"
  | "numero"
  | "selecao"
  | "booleano"
  | "multipla"
  | "renda"
  | "escala"
  | "sensivel";

export type QuestaoEthos = {
  id: string;
  pergunta: string;
  tipo: TipoQuestao;
  opcoes?: readonly string[];
  maxSelecoes?: number;
  dependeDe?: { id: string; valor: string };
  ajuda?: string;
};

export type BlocoEthos = {
  numero: number;
  titulo: string;
  descricao?: string;
  questoes: readonly QuestaoEthos[];
};

const renda = ["Sem renda", "Até 1 salário mínimo", "Mais de 1 até 2 salários mínimos", "Mais de 2 até 5 salários mínimos", "Mais de 5 até 10 salários mínimos", "Mais de 10 salários mínimos", "Prefiro não responder"] as const;

export const BLOCOS_ETHOS: readonly BlocoEthos[] = [
  {
    numero: 0,
    titulo: "Consentimento e privacidade",
    descricao: "Suas respostas ajudam a NAVIRA a oferecer recomendações mais adequadas. Você poderá optar por não responder a perguntas sensíveis.",
    questoes: [
      { id: "Q0.1", pergunta: "Você concorda em participar do Mapa de Mobilidade Humana NAVIRA?", tipo: "booleano" },
      { id: "Q0.2", pergunta: "Você autoriza a NAVIRA a utilizar suas respostas para recomendar cursos, oportunidades profissionais e jornadas de desenvolvimento compatíveis com seu perfil?", tipo: "booleano" },
      { id: "Q0.3", pergunta: "Você autoriza o uso dos seus dados, de forma agregada e/ou anonimizada, para estudos e indicadores de mobilidade econômica?", tipo: "booleano" },
      { id: "Q0.4", pergunta: "Você autoriza a NAVIRA a entrar em contato com você sobre oportunidades de cursos, trabalho e desenvolvimento?", tipo: "booleano" },
    ],
  },
  {
    numero: 1,
    titulo: "Identificação",
    questoes: [
      { id: "Q1.1", pergunta: "Como você gostaria de ser chamado(a)?", tipo: "texto" },
      { id: "Q1.2", pergunta: "Qual é a sua idade?", tipo: "numero" },
      { id: "Q1.3", pergunta: "Em qual cidade você mora?", tipo: "texto", ajuda: "Informe sua cidade." },
      { id: "Q1.4", pergunta: "Em qual bairro você mora?", tipo: "texto" },
      { id: "Q1.5", pergunta: "Qual é o seu estado civil?", tipo: "selecao", opcoes: ["Solteiro(a)", "Casado(a)", "União estável", "Separado(a) / divorciado(a)", "Viúvo(a)", "Prefiro não responder"] },
      { id: "Q1.6", pergunta: "Você tem filhos?", tipo: "booleano" },
      { id: "Q1.6_quantidade", pergunta: "Quantos filhos você tem?", tipo: "numero", dependeDe: { id: "Q1.6", valor: "Sim" } },
      { id: "Q1.7", pergunta: "Como você se identifica em relação a cor ou raça?", tipo: "sensivel", opcoes: ["Branca", "Preta", "Parda", "Amarela", "Indígena", "Prefiro não responder"], ajuda: "Opcional. A resposta só será armazenada se você autorizar explicitamente." },
      { id: "Q1.8", pergunta: "Você possui alguma religião ou tradição espiritual?", tipo: "sensivel", opcoes: ["Católica", "Evangélica", "Espírita", "Umbanda", "Candomblé", "Judaica", "Islâmica", "Budista", "Outra", "Sem religião", "Prefiro não responder"], ajuda: "Opcional. A resposta só será armazenada se você autorizar explicitamente." },
      { id: "Q1.9", pergunta: "Qual é o seu nível de escolaridade?", tipo: "selecao", opcoes: ["Sem escolaridade", "Ensino fundamental incompleto", "Ensino fundamental completo", "Ensino médio incompleto", "Ensino médio completo", "Ensino técnico", "Ensino superior incompleto", "Ensino superior completo", "Pós-graduação", "Prefiro não responder"] },
      { id: "Q1.10", pergunta: "Qual é a sua situação profissional atualmente?", tipo: "selecao", opcoes: ["Empregado(a) CLT", "Empregado(a) sem carteira", "Autônomo(a)", "MEI", "Empresário(a)", "Freelancer", "Estagiário(a)", "Estudante", "Desempregado(a)", "Procurando o primeiro emprego", "Outro"] },
      { id: "Q1.11", pergunta: "Qual é aproximadamente a sua renda mensal individual?", tipo: "renda", opcoes: renda },
      { id: "Q1.12", pergunta: "Qual é aproximadamente a renda mensal da sua família?", tipo: "renda", opcoes: renda },
    ],
  },
  {
    numero: 2,
    titulo: "Território",
    descricao: "Queremos entender o território como parte da sua experiência.",
    questoes: [
      { id: "Q2.1", pergunta: "Você gosta do bairro onde mora?", tipo: "escala" },
      { id: "Q2.2", pergunta: "O que existe de melhor no seu bairro?", tipo: "texto_longo" },
      { id: "Q2.3", pergunta: "O que existe de pior no seu bairro?", tipo: "texto_longo" },
      { id: "Q2.4", pergunta: "Você sente que seu bairro oferece oportunidades para crescer profissionalmente e melhorar de vida?", tipo: "escala" },
      { id: "Q2.5", pergunta: "Você gostaria de continuar vivendo nesse bairro daqui a 10 anos?", tipo: "selecao", opcoes: ["Sim", "Não", "Talvez", "Ainda não sei"] },
    ],
  },
  {
    numero: 3,
    titulo: "História de vida",
    descricao: "Aqui começa a parte qualitativa. Compartilhe apenas o que se sentir confortável em contar.",
    questoes: [
      { id: "Q3.1", pergunta: "Conte um pouco da sua trajetória.", tipo: "texto_longo" },
      { id: "Q3.2", pergunta: "O que mais marcou sua vida até hoje?", tipo: "texto_longo" },
      { id: "Q3.3", pergunta: "Quem foi a pessoa que mais influenciou você?", tipo: "texto_longo" },
      { id: "Q3.4", pergunta: "Por quê?", tipo: "texto_longo" },
      { id: "Q3.5", pergunta: "Qual foi sua maior conquista até hoje?", tipo: "texto_longo" },
      { id: "Q3.6", pergunta: "Qual foi sua maior dificuldade até hoje?", tipo: "texto_longo" },
    ],
  },
  {
    numero: 4,
    titulo: "Ethos",
    descricao: "Queremos compreender o que dá sentido às suas escolhas.",
    questoes: [
      { id: "Q4.1", pergunta: "O que você mais valoriza na vida?", tipo: "multipla", opcoes: ["Família", "Independência", "Segurança", "Fé", "Estabilidade", "Dinheiro", "Conhecimento", "Liberdade", "Reconhecimento", "Comunidade", "Outro"], maxSelecoes: 3, ajuda: "Escolha até 3 opções." },
      { id: "Q4.2", pergunta: "O que faz você sentir orgulho?", tipo: "texto_longo" },
      { id: "Q4.3", pergunta: "O que você admira nas pessoas?", tipo: "texto_longo" },
      { id: "Q4.4", pergunta: "Quem é uma pessoa de sucesso para você?", tipo: "texto_longo" },
    ],
  },
  {
    numero: 5,
    titulo: "Sonhos",
    questoes: [
      { id: "Q5.1", pergunta: "Onde você gostaria de estar daqui a 5 anos?", tipo: "texto_longo" },
      { id: "Q5.2", pergunta: "Qual é o seu maior sonho hoje?", tipo: "texto_longo" },
      { id: "Q5.3", pergunta: "O que precisa acontecer para você dizer: “Minha vida melhorou”?", tipo: "texto_longo" },
      { id: "Q5.4", pergunta: "Se você pudesse mudar uma coisa na sua vida imediatamente, o que seria?", tipo: "texto_longo" },
    ],
  },
  {
    numero: 6,
    titulo: "Motivação",
    questoes: [
      { id: "Q6.1", pergunta: "O que mais te motiva a estudar ou trabalhar?", tipo: "multipla", opcoes: ["Ajudar minha família", "Ganhar mais dinheiro", "Realizar um sonho", "Ter independência", "Aprender", "Construir uma carreira", "Abrir um negócio", "Outro"] },
      { id: "Q6.2", pergunta: "Quando você enfrenta dificuldades, o que normalmente faz?", tipo: "selecao", opcoes: ["Insisto", "Procuro ajuda", "Mudo de caminho", "Espero", "Outro"] },
    ],
  },
  {
    numero: 7,
    titulo: "Aspiração profissional",
    questoes: [
      { id: "Q7.1", pergunta: "Qual profissão você gostaria de exercer?", tipo: "texto" },
      { id: "Q7.2", pergunta: "Existe alguma área em que você jamais gostaria de trabalhar?", tipo: "texto_longo" },
      { id: "Q7.3", pergunta: "Qual ambiente combina mais com você?", tipo: "multipla", opcoes: ["Escritório", "Rua", "Atendimento ao público", "Tecnologia", "Trabalho manual", "Educação", "Saúde", "Vendas", "Outro"] },
      { id: "Q7.4", pergunta: "Você prefere:", tipo: "selecao", opcoes: ["Estabilidade", "Crescimento rápido", "Empreender", "Ainda não sei"] },
    ],
  },
  {
    numero: 8,
    titulo: "Capital social",
    questoes: [
      { id: "Q8.1", pergunta: "Você conhece alguém que poderia ajudar você a conseguir um emprego ou uma oportunidade profissional?", tipo: "selecao", opcoes: ["Sim", "Não", "Não tenho certeza"] },
      { id: "Q8.2", pergunta: "Você participa de algum destes grupos ou organizações?", tipo: "multipla", opcoes: ["Igreja", "Associação", "Coletivo cultural", "ONG", "Grupo esportivo", "Outro", "Nenhum"] },
      { id: "Q8.3", pergunta: "Com quem você conversa quando precisa tomar decisões importantes?", tipo: "texto_longo" },
    ],
  },
  {
    numero: 9,
    titulo: "Bem-estar",
    questoes: [
      { id: "Q9.1", pergunta: "Você se sente feliz atualmente?", tipo: "escala" },
      { id: "Q9.2", pergunta: "Você se sente otimista em relação ao futuro?", tipo: "escala" },
      { id: "Q9.3", pergunta: "Você acredita que conseguirá alcançar seus objetivos?", tipo: "escala" },
    ],
  },
  {
    numero: 10,
    titulo: "Travessia NAVIRA",
    descricao: "Imagine que nos encontremos novamente daqui a cinco anos.",
    questoes: [
      { id: "Q10.1", pergunta: "O que precisaria ter acontecido para você dizer: “Essa foi a melhor fase da minha vida”?", tipo: "texto_longo" },
    ],
  },
] as const;

export const VERSAO_QUESTIONARIO_ETHOS = "perfil-travessia-v1.0";

export function valorCondicionalVisivel(questao: QuestaoEthos, respostas: Record<string, unknown>) {
  if (!questao.dependeDe) return true;
  return respostas[questao.dependeDe.id] === questao.dependeDe.valor;
}
