# NAVIRA — app (MVP)

Aplicação construída a partir dos documentos em [docs/](docs/). Stack: Next.js 16 (App Router), React 19, Prisma 7 com adaptador `pg` e PostgreSQL.

## Rodar localmente

1. PostgreSQL com um banco `navira`.
2. `cp .env.example .env` e ajuste `DATABASE_URL` e `SESSION_SECRET` (gere com `openssl rand -hex 32`).
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

## O que ainda não foi feito

- **Questionário Ethos:** `docs/navegante/questionarioEthos.md` está vazio. A rota `/navegante/ethos` existe, mas só mostra o aviso e leva ao painel.
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
