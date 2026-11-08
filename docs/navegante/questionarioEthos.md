# Questionário de Perfil de Travessia NAVIRA — v1.0

Implementação baseada em `SPEC_Questionario_Perfil_de_Travessia_v1.0.docx`.

O preenchimento é obrigatório para o Navegante acessar o painel **Meus Portos**. O progresso é salvo ao avançar ou voltar entre blocos. As perguntas são obrigatórias, exceto pelo tratamento de raça/cor e religião: cada uma requer consentimento explícito e oferece “Prefiro não responder”.

Uma barra de navegação horizontal no topo do questionário permite ir diretamente a qualquer bloco já preenchido; blocos ainda não alcançados aparecem com cadeado e só desbloqueiam na ordem. Após a conclusão, o Navegante pode revisar e editar qualquer bloco pelo botão **Editar Ethos** no painel Meus Portos — edições regravam o Matching-Navegante.

Ao concluir, as respostas não sensíveis são organizadas em um objeto JSON de Perfil de Travessia por eixo (condições materiais, território, história de vida, ethos, sonhos, motivações, aspiração profissional, capital social, bem-estar e projeto de vida). Respostas de raça/cor e religião ficam fora desse perfil e são armazenadas separadamente, criptografadas.

## Bloco 0 — Consentimento

- **Q0.1** Você concorda em participar do Mapa de Mobilidade Humana NAVIRA? (Sim/Não; responder “Não” interrompe o questionário.)
- **Q0.2** Você autoriza a NAVIRA a utilizar suas respostas para recomendar cursos, oportunidades profissionais e jornadas de desenvolvimento compatíveis com seu perfil? (Sim/Não)
- **Q0.3** Você autoriza o uso dos seus dados, de forma agregada e/ou anonimizada, para estudos e indicadores de mobilidade econômica? (Sim/Não)
- **Q0.4** Você autoriza a NAVIRA a entrar em contato com você sobre oportunidades de cursos, trabalho e desenvolvimento? (Sim/Não)

## Bloco 1 — Identificação

- **Q1.1** Como você gostaria de ser chamado(a)?
- **Q1.2** Qual é a sua idade?
- **Q1.3** Em qual cidade você mora?
- **Q1.4** Em qual bairro você mora?
- **Q1.5** Qual é o seu estado civil?
- **Q1.6** Você tem filhos? Se sim: quantos?
- **Q1.7** Como você se identifica em relação a cor ou raça? Branca, Preta, Parda, Amarela, Indígena ou Prefiro não responder.
- **Q1.8** Você possui alguma religião ou tradição espiritual? Católica, Evangélica, Espírita, Umbanda, Candomblé, Judaica, Islâmica, Budista, Outra, Sem religião ou Prefiro não responder.
- **Q1.9** Qual é o seu nível de escolaridade?
- **Q1.10** Qual é a sua situação profissional atualmente? Empregado(a) CLT, empregado(a) sem carteira, autônomo(a), MEI, empresário(a), freelancer, estagiário(a), estudante, desempregado(a), procurando o primeiro emprego ou outro.
- **Q1.11** Qual é aproximadamente a sua renda mensal individual?
- **Q1.12** Qual é aproximadamente a renda mensal da sua família?

As respostas de Q1.7 e Q1.8 são opcionais, têm consentimento próprio e são armazenadas separadamente, criptografadas. A pessoa pode escolher “Prefiro não responder”.

## Bloco 2 — Território

- **Q2.1** Você gosta do bairro onde mora? Escala de 1 (Não gosto) a 10 (Gosto muito).
- **Q2.2** O que existe de melhor no seu bairro?
- **Q2.3** O que existe de pior no seu bairro?
- **Q2.4** Você sente que seu bairro oferece oportunidades para crescer profissionalmente e melhorar de vida? Escala de 1 (Nenhuma oportunidade) a 10 (Muitas oportunidades).
- **Q2.5** Você gostaria de continuar vivendo nesse bairro daqui a 10 anos? Sim, Não, Talvez ou Ainda não sei.

## Bloco 3 — História de vida

- **Q3.1** Conte um pouco da sua trajetória.
- **Q3.2** O que mais marcou sua vida até hoje?
- **Q3.3** Quem foi a pessoa que mais influenciou você?
- **Q3.4** Por quê?
- **Q3.5** Qual foi sua maior conquista até hoje?
- **Q3.6** Qual foi sua maior dificuldade até hoje?

## Bloco 4 — Ethos

- **Q4.1** O que você mais valoriza na vida? Escolha até 3: Família, Independência, Segurança, Fé, Estabilidade, Dinheiro, Conhecimento, Liberdade, Reconhecimento, Comunidade ou Outro.
- **Q4.2** O que faz você sentir orgulho?
- **Q4.3** O que você admira nas pessoas?
- **Q4.4** Quem é uma pessoa de sucesso para você?

## Bloco 5 — Sonhos

- **Q5.1** Onde você gostaria de estar daqui a 5 anos?
- **Q5.2** Qual é o seu maior sonho hoje?
- **Q5.3** O que precisa acontecer para você dizer: “Minha vida melhorou”?
- **Q5.4** Se você pudesse mudar uma coisa na sua vida imediatamente, o que seria?

## Bloco 6 — Motivação

- **Q6.1** O que mais te motiva a estudar ou trabalhar? Ajudar minha família, Ganhar mais dinheiro, Realizar um sonho, Ter independência, Aprender, Construir uma carreira, Abrir um negócio ou Outro.
- **Q6.2** Quando você enfrenta dificuldades, o que normalmente faz? Insisto, Procuro ajuda, Mudo de caminho, Espero ou Outro.

## Bloco 7 — Aspiração profissional

- **Q7.1** Qual profissão você gostaria de exercer?
- **Q7.2** Existe alguma área em que você jamais gostaria de trabalhar?
- **Q7.3** Qual ambiente combina mais com você? Escritório, Rua, Atendimento ao público, Tecnologia, Trabalho manual, Educação, Saúde, Vendas ou Outro.
- **Q7.4** Você prefere: Estabilidade, Crescimento rápido, Empreender ou Ainda não sei.

## Bloco 8 — Capital social

- **Q8.1** Você conhece alguém que poderia ajudar você a conseguir um emprego ou uma oportunidade profissional? Sim, Não ou Não tenho certeza.
- **Q8.2** Você participa de algum destes grupos ou organizações? Igreja, Associação, Coletivo cultural, ONG, Grupo esportivo, Outro ou Nenhum.
- **Q8.3** Com quem você conversa quando precisa tomar decisões importantes?

## Bloco 9 — Bem-estar

- **Q9.1** Você se sente feliz atualmente? Escala de 1 a 10.
- **Q9.2** Você se sente otimista em relação ao futuro? Escala de 1 a 10.
- **Q9.3** Você acredita que conseguirá alcançar seus objetivos? Escala de 1 a 10.

## Bloco 10 — Travessia NAVIRA

Em uma tela especial, sem outras perguntas: **Imagine que nos encontremos novamente daqui a cinco anos. O que precisaria ter acontecido para você dizer: “Essa foi a melhor fase da minha vida”?**
