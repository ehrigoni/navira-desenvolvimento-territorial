# NAVIRA — app (MVP)

Aplicação construída a partir dos documentos em [docs/](docs/). Stack: Next.js 16 (App Router), React 19, Prisma 7 com adaptador `pg` e PostgreSQL.

## Rodar localmente

1. PostgreSQL com um banco `navira`.
2. `cp .env.example .env` e ajuste `DATABASE_URL`, `SESSION_SECRET` (gere com `openssl rand -hex 32`) e `DATA_ENCRYPTION_KEY` (chave base64 de 32 bytes ou frase secreta com pelo menos 16 caracteres).
3. `npm install`
4. `npx prisma migrate dev` (cria as tabelas)
5. `npm run db:seed` (dados de exemplo; senha de demonstração `navira2026`)
6. `npm run dev` e abra http://localhost:3000

Logins de demonstração: navegante `(11) 91234-5678`, porto `porto@exemplo.com.br`.

## O que está pronto

| Área | Base no docs | Situação |
|---|---|---|
| Entrada: Navegante ou Porto | `docs/entrada/fluxos-agentes.md` | Pronto |
| Login por celular, telefone fixo ou e-mail, validação no navegador e no servidor | `docs/entrada/regras-tela-login.md`, `fix-login-servidor.md` | Pronto, sem limite de tentativas |
| Cadastro (Navegante ou Porto) | `docs/entrada/fix-login-servidor.md` | Pronto |
| Recuperação de senha (token de 1 hora, limite de 3 pedidos por hora, mensagem genérica) | `docs/entrada/ESPECIFICACAO_RECUPERACAO_SENHA.md` | Pronto; envio por e-mail/WhatsApp ainda não |
| Painel do Navegante: portos, vagas, cursos | `docs/navegante/relacoes-meus-portos.md`, `matchingVagas.md` | Pronto, com matching parcial |
| Painel do Porto: vagas, cursos, outros portos da região | `docs/porto/relacoes-meus-portos.md` | Pronto |
| Modelo de dados | `docs/porto/indicadores.prisma`, `relacoes-meus-portos.md` | Parcial (ver abaixo) |
| Identidade visual | `docs/marca/Design-System-Navira.md` | Cores e tipografia |

### Vagas e apadrinhamento de portos

Ao cadastrar um porto, é criada uma cobrança pendente de uma vaga para ele. Cada vaga custa R$ 1.300,00 e gera um crédito de contratação para o porto beneficiário após a confirmação do pagamento. Um porto pode comprar várias vagas para si ou para outro porto e também transferir créditos disponíveis para outros portos. A primeira compra após o vencimento ativa a assinatura do pagador por um ano, mesmo quando o beneficiário é outro porto. Créditos disponíveis podem ser usados sem assinatura ativa.

No painel do Porto, a busca adiciona portos a uma lista persistente de possíveis beneficiários. A seleção, por si só, não transfere créditos nem confirma pagamento; portos ainda não beneficiados podem ser removidos da lista. Na aba Dados do Porto, o responsável pode editar nome, endereço e, opcionalmente, razão social, CNPJ e CNAE, sem alterar identificadores anteriores de outros tipos. A descrição do CNAE é preenchida automaticamente a partir do catálogo CNAE 2.3 em [docs/navegante/cnae.xls](docs/navegante/cnae.xls); códigos ausentes são informados ao usuário.

O cadastro de cursos aceita período e vagas disponíveis opcionais. As vagas podem informar requisitos, expectativas, benefícios e cursos exigidos; sua publicação não consome crédito, mas a escolha de um candidato exige um crédito disponível.

### Administração

Administradores podem entrar em `/admin` ou pela tela de login geral, usando uma conta administrativa separada. Na tela `/admin`, a solicitação de cadastro não exige convite e fica inativa até que um administrador existente a aprove no painel. O sistema não verifica a posse do telefone ou e-mail: confirme a identidade do solicitante por um canal confiável antes de aprovar. O fluxo anterior de convites está desativado. Cada acesso e operação administrativa verifica se a conta continua ativa. Após cinco tentativas inválidas, a conta administrativa é bloqueada por 15 minutos. Administradores criados diretamente pelo painel precisam trocar a senha no primeiro acesso. Novos cadastros de Porto aguardam aprovação; registros anteriores permanecem com o acesso que tinham. A suspensão bloqueia novas operações e o acesso ao painel, sem apagar dados ou históricos.

O painel apresenta dados cadastrados e pagamentos com status pago, não valores bancários conciliados. Ganhos por curso, impacto social e recomendações comerciais ficam identificados como indisponíveis enquanto não houver fontes e métodos confiáveis.

Na aba Impacto NAVIRA, os indicadores são agregados para toda a rede, como no painel do Porto. Cursos concluídos correspondem aos registros do histórico de formação dos Navegantes, não necessariamente a cursos oferecidos pela plataforma. A aba Mapa de atuação dos Portos mostra a presença de cadastros por município, inclusive Portos pendentes ou inativos, com botões de filtro por tipo de entidade; não representa áreas reais de atuação ou endereços precisos. O mapa usa os limites municipais do IBGE presentes em [mapa-ceps.html](docs/navegante/mapa-ceps.html), com cobertura de 14 municípios da região metropolitana de Porto Alegre. Portos fora dessa cobertura e cadastros sem município ou UF são listados separadamente.

Na administração, clique em qualquer área dos cards do NAVIRA Impact Score para expandir ou recolher os indicadores descritos nos documentos e os pesos que foram definidos. O cabeçalho de cada card também pode ser acionado pelo teclado. Apenas pessoas cadastradas tem contagem disponível nesse detalhamento; os demais itens são identificados como indisponíveis para cálculo, sem atribuir dados aproximados a indicadores que exigem outra metodologia.

Na lista Portos e territórios e nas listas do mapa, clique no indicador de situação para habilitar ou desabilitar o Porto. As listas mostram as contagens de navegantes vinculados, vagas e cursos. Registros em análise continuam identificados como tais e seguem habilitados até serem desabilitados; solicitações de cadastro pendentes aparecem no mapa apenas para consulta e permanecem na fila de aprovação.

O cabeçalho comum exibe Entrar sem sessão ativa e Sair para contas autenticadas e habilitadas; Sair encerra a sessão e retorna à página inicial.

Na camada de Portos, cada marcador é distribuído artificialmente dentro do município cadastrado e colorido conforme o tipo de entidade. Os marcadores são esquemáticos: sua posição não indica o endereço, CEP ou área real de atuação, mesmo quando houver coordenadas no cadastro. Consulte a lista do município para identificar os Portos. Caso a geometria não comporte todos os marcadores, os registros restantes são listados separadamente.

Os filtros de tipo no mapa podem ser ligados ou desligados independentemente, permitindo combinações ou nenhum tipo selecionado. O botão Todos volta a selecionar todos os tipos.

A camada **CEPs com CNAE** usa um retrato estático de [empresasCnaes.xlsx](docs/navegante/empresasCnaes.xlsx), agregado por município, CEP e atividade. Ela permite buscar CEP, CNAE, atividade ou município e mostra a quantidade de registros da planilha por combinação. Os CNAEs são associações da própria planilha, não verificação cadastral das empresas; registros sem CEP completo ou CNAE identificado são contabilizados como incompletos e não entram na lista. O arquivo não fornece coordenadas, portanto os CEPs não são marcados como pontos exatos, e os dados da planilha não são atualizados automaticamente a partir dos cadastros do portal.

As empresas da planilha podem ser importadas como Portos do tipo Empresa, ativos e sem conta de usuário. A fonte OpenStreetMap identifica cada registro; a importação não verifica a situação cadastral nem confirma os CNAEs, não inventa CNPJ e mantém vazios os CEPs ou CNAEs incompletos. O endereço é preservado como texto, sem inventar separação entre rua e número. A importação não sobrescreve registros já importados e ignora possíveis duplicados por nome e município para revisão manual. Após aplicar [prisma/atualizar-tipo-empresa.sql](prisma/atualizar-tipo-empresa.sql), execute `npm run db:importar-empresas` para simular no banco configurado; depois de conferir o destino e os possíveis duplicados, use `npm run db:importar-empresas -- --aplicar`. A migração e a importação devem ser executadas separadamente em cada ambiente; publicar o código não importa os dados automaticamente.

Para criar o primeiro administrador, defina `DATABASE_URL` por um mecanismo seguro no ambiente do terminal e execute `npm run db:criar-admin`. O comando mostra o destino do banco e exige confirmação, recebe a senha sem exibi-la e não altera contas existentes; a senha deve ser trocada no primeiro acesso. Não coloque credenciais no histórico do shell, em arquivos versionados ou nos logs. Execute o comando com acesso autorizado ao banco de produção. Antes de publicar o painel, aplique as migrações indicadas abaixo ao banco de destino.

As compras geram cobranças pendentes. A confirmação simulada só está disponível fora de produção; a integração com um gateway de pagamento ainda não foi implementada.

### Candidatos e vínculo exclusivo

O painel de candidatos fica abaixo de assinatura e contratação. Antes da escolha, exibe apenas o primeiro nome e cursos concluídos (curso, instituição e carga horária). A escolha debita uma cota, libera nome completo, telefone e e-mail ao Porto responsável e oculta as demais candidaturas para outros Portos. Não expõe respostas sensíveis do Ethos.

Os demais candidatos permanecem disponíveis, inclusive em vagas pausadas. O Navegante pode retirar qualquer candidatura enquanto não tiver vínculo ativo. Somente o Porto responsável pode encerrar o vínculo e registrar um motivo opcional, sem ressarcimento; o Navegante volta a ficar disponível e o tempo em dias entre escolha e encerramento é exibido por três meses. O Porto anterior mantém acesso aos contatos até uma escolha por outro Porto. O motivo registrado não é divulgado aos demais Portos.

Antes de publicar esta funcionalidade, execute `npm run db:atualizar-porto` com `DATABASE_URL` apontando para o banco de destino. O comando aplica [prisma/atualizar-porto.sql](prisma/atualizar-porto.sql), [prisma/atualizar-contratacoes.sql](prisma/atualizar-contratacoes.sql), [prisma/atualizar-dados-porto.sql](prisma/atualizar-dados-porto.sql), [prisma/atualizar-admin.sql](prisma/atualizar-admin.sql), [prisma/atualizar-convites-admin.sql](prisma/atualizar-convites-admin.sql), [prisma/atualizar-aprovacao-admin.sql](prisma/atualizar-aprovacao-admin.sql) e [prisma/atualizar-tipo-empresa.sql](prisma/atualizar-tipo-empresa.sql), inclusive em bancos que ainda não receberam as colunas de assinatura/créditos e as tabelas de pagamentos, apadrinhamentos e apoios. Os scripts são idempotentes e não removem registros; substituem a unicidade por vaga/candidato para permitir histórico de vínculos. O script de dados acrescenta os dados opcionais do Porto e copia o identificador existente quando for CNPJ; os scripts de administração preservam o estado das contas existentes.

Na Vercel, a atualização pode ser executada em um build de manutenção com `npm run db:atualizar-porto && npm run build`, usando as variáveis de produção já configuradas. Não use `db push` com perda de dados nem copie o `.env` local para o deploy. Para conferir o schema após a atualização, use `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` no mesmo ambiente.

## O que ainda não foi feito

- **Questionário Ethos:** o Perfil de Travessia v1.0 é preenchido em 11 blocos, com salvamento de progresso; o Navegante só acessa o painel após concluir.
- **Matching completo:** o índice usa só a proximidade (mesma cidade ou UF). Os pesos do Ethos, CNAE e cursos entram quando o Ethos existir.
- **Envio de recuperação:** o link é gravado no log do servidor (`[recuperacao:email]`). Falta integrar Resend/SendGrid e Twilio.
- **Indicadores** (Navira em Números, IIP, IDT): `docs/porto/*.ts` ainda não foram ligados ao app. Os models de `Contratacao` e `MunicipioPrioritario` do `indicadores.prisma` não entraram no schema.
- **Mapa dos portos:** limitado aos 14 municípios incluídos no arquivo fornecido; não mostra a localização exata dos Portos.
- **Cotas e pagamento** (`precos-e-cotas.md`): não implementados.
- **Perfis Destino, Trilha e Apoiador:** os fluxos de cadastro e painéis operacionais ainda não estão habilitados.

## Decisões tomadas

- Token de recuperação guardado como hash SHA-256 (o original só vai ao usuário).
- Sessão em cookie `httpOnly` assinado com HMAC; não há tabela de sessões.
- Mesma mensagem de erro para usuário inexistente e senha errada. Quando o usuário não existe, o bcrypt roda contra um hash de comparação, para o tempo de resposta ser parecido.
