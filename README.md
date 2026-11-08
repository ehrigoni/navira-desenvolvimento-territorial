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

No painel do Porto, a busca adiciona portos a uma lista persistente de possíveis beneficiários. A seleção, por si só, não transfere créditos nem confirma pagamento; portos ainda não beneficiados podem ser removidos da lista.

As compras geram cobranças pendentes. A confirmação simulada só está disponível fora de produção; a integração com um gateway de pagamento ainda não foi implementada.

### Candidatos e vínculo exclusivo

O painel de candidatos fica abaixo de assinatura e contratação. Antes da escolha, exibe apenas o primeiro nome e cursos concluídos (curso, instituição e carga horária). A escolha debita uma cota, libera nome completo, telefone e e-mail ao Porto responsável e oculta as demais candidaturas para outros Portos. Não expõe respostas sensíveis do Ethos.

Os demais candidatos permanecem disponíveis, inclusive em vagas pausadas. O Navegante pode retirar qualquer candidatura enquanto não tiver vínculo ativo. Somente o Porto responsável pode encerrar o vínculo e registrar um motivo opcional, sem ressarcimento; o Navegante volta a ficar disponível e o tempo em dias entre escolha e encerramento é exibido por três meses. O Porto anterior mantém acesso aos contatos até uma escolha por outro Porto. O motivo registrado não é divulgado aos demais Portos.

Antes de publicar esta funcionalidade, execute `npm run db:atualizar-porto` com `DATABASE_URL` apontando para o banco de destino. O comando aplica [prisma/atualizar-porto.sql](prisma/atualizar-porto.sql) e [prisma/atualizar-contratacoes.sql](prisma/atualizar-contratacoes.sql), inclusive em bancos que ainda não receberam as colunas de assinatura/créditos e as tabelas de pagamentos, apadrinhamentos e apoios. Os scripts são idempotentes e não removem registros; substituem a unicidade por vaga/candidato para permitir histórico de vínculos.

Na Vercel, a atualização pode ser executada em um build de manutenção com `npm run db:atualizar-porto && npm run build`, usando as variáveis de produção já configuradas. Não use `db push` com perda de dados nem copie o `.env` local para o deploy. Para conferir o schema após a atualização, use `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` no mesmo ambiente.

## O que ainda não foi feito

- **Questionário Ethos:** o Perfil de Travessia v1.0 é preenchido em 11 blocos, com salvamento de progresso; o Navegante só acessa o painel após concluir.
- **Matching completo:** o índice usa só a proximidade (mesma cidade ou UF). Os pesos do Ethos, CNAE e cursos entram quando o Ethos existir.
- **Envio de recuperação:** o link é gravado no log do servidor (`[recuperacao:email]`). Falta integrar Resend/SendGrid e Twilio.
- **Indicadores** (Navira em Números, IIP, IDT): `docs/porto/*.ts` ainda não foram ligados ao app. Os models de `Contratacao` e `MunicipioPrioritario` do `indicadores.prisma` não entraram no schema.
- **Iniciativas e mapa dos portos:** não implementados.
- **Cotas e pagamento** (`precos-e-cotas.md`): não implementados.
- **Perfis Destino, Trilha e Apoiador:** só existem Navegante e Porto no cadastro.

## Decisões tomadas

- Token de recuperação guardado como hash SHA-256 (o original só vai ao usuário).
- Sessão em cookie `httpOnly` assinado com HMAC; não há tabela de sessões.
- Mesma mensagem de erro para usuário inexistente e senha errada. Quando o usuário não existe, o bcrypt roda contra um hash de comparação, para o tempo de resposta ser parecido.
