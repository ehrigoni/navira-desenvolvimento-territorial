# 📋 Especificação: Sistema de Recuperação de Senha

**Versão:** 1.0.0  
**Data:** 2026-10-06  
**Status:** Em Desenvolvimento  

---

## 1. Visão Geral

Sistema de recuperação de senha que permite ao usuário restaurar acesso à sua conta através de:
- 📧 E-mail (com link de resetagem)
- 💬 WhatsApp (com código de resetagem)

---

## 2. Fluxo de Usuário

### 2.1 Entrar na Recuperação

```
Tela de Login
    ↓
Clique em "Esqueci minha senha"
    ↓
Página /esqueci-senha
```

### 2.2 Selecionar Método

```
1. Digitar e-mail ou telefone
2. Escolher método:
   - Por E-mail (link de resetagem)
   - Por WhatsApp (código numérico)
3. Clicar "Recuperar Senha"
```

### 2.3 Confirmação

```
Servidor processa:
  ✅ Valida e-mail/telefone
  ✅ Procura usuário no banco
  ✅ Gera token de recuperação (1 hora)
  ✅ Envia por email/WhatsApp
  ✅ Retorna mensagem de sucesso

Usuário vê:
  "Se o e-mail estiver registrado, você receberá instruções..."
  (por segurança, não revela se usuário existe)
```

### 2.4 Receber e Usar Token

**Por E-mail:**
- Usuário recebe email com link
- Link contém token de recuperação
- Clica no link → vai para página de nova senha

**Por WhatsApp:**
- Usuário recebe mensagem com código
- Código tem 6 dígitos
- Digita código na página → valida e deixa criar nova senha

---

## 3. Arquivos Implementados

### 3.1 Frontend

#### `/src/app/entrar/page.tsx`
- Adicionado link "Esqueci minha senha" ao lado de "Cadastre-se"
- Link vai para `/esqueci-senha`

#### `/src/app/esqueci-senha/page.tsx`
- Página de recuperação de senha
- Título: "Recuperar Senha"
- Componente `RecuperarSenhaForm`

#### `/src/app/esqueci-senha/RecuperarSenhaForm.tsx`
- Formulário com:
  - Input de e-mail ou telefone (com máscara)
  - Radio buttons para selecionar método (Email / WhatsApp)
  - Validação de formato
  - Feedback de sucesso/erro

### 3.2 Backend

#### `/src/app/esqueci-senha/actions.ts`
- Função `recuperarSenha()`
- Validação de entrada
- Procura usuário no banco de dados
- Gera token de recuperação (válido por 1 hora)
- Atualiza `tokenRecuperacao` e `expiracaoTokenRecuperacao` no banco
- Log para envio de email/WhatsApp (TODO)

---

## 4. Banco de Dados

### 4.1 Alterações no Schema

Campos adicionados ao modelo `Usuario`:

```prisma
model Usuario {
  // ... campos existentes ...

  // Recuperação de senha
  tokenRecuperacao              String?   @db.VarChar(255) // Token hex de 32 bytes
  expiracaoTokenRecuperacao     DateTime? // Expira em 1 hora

  // ... resto dos campos ...
}
```

### 4.2 Migração Necessária

```bash
npx prisma migrate dev --name add_password_recovery_fields
```

---

## 5. Fluxo Técnico

### 5.1 Submeter Formulário

```
POST /esqueci-senha (via action)
  ├─ Validar identificador (email ou telefone)
  ├─ Validar método (email ou whatsapp)
  ├─ Procurar usuário no banco
  ├─ Gerar token: crypto.randomBytes(32).toString("hex")
  ├─ Salvar no banco com expiração 1 hora
  ├─ Enviar por email/WhatsApp (TODO)
  └─ Retornar mensagem genérica (por segurança)
```

### 5.2 Validação

```
Identificador:
  ✅ Formato válido de email (xxx@xxx.xx)
  ✅ OU formato válido de telefone (11 dígitos com DDD)
  ✅ Campo não vazio

Método:
  ✅ "email" ou "whatsapp" obrigatório
```

---

## 6. Segurança

### 6.1 Boas Práticas

✅ **Não revela se usuário existe**
- Mesma mensagem para email existente e inexistente
- Previne enumeração de usuários

✅ **Token com expiração**
- Token válido por 1 hora
- Evita uso indefinido

✅ **Token aleatório**
- 32 bytes em hex (256 bits)
- Criptograficamente seguro

✅ **HTTPS obrigatório**
- Links/códigos apenas em canais seguros

### 6.2 Próximos Passos (TODO)

- [ ] Implementar envio de email (Resend, SendGrid, etc)
- [ ] Implementar envio de WhatsApp (Twilio, MessageBird, etc)
- [ ] Criar página de resetagem de senha com token
- [ ] Validar token antes de permitir nova senha
- [ ] Log de tentativas de recuperação
- [ ] Rate limiting (máximo 3 tentativas por hora)

---

## 7. Estados e Mensagens

### 7.1 Sucesso

```
"Se o e-mail estiver registrado, você receberá instruções de recuperação em breve."

OU

"Se o telefone estiver registrado, você receberá instruções de recuperação em breve."
```

### 7.2 Erros de Validação

```
Identificador vazio:
  "E-mail ou telefone é obrigatório."

Método não selecionado:
  "Escolha um método de recuperação."

Email/Telefone inválido:
  "E-mail inválido." ou "Telefone inválido."
```

### 7.3 Erro do Servidor

```
"Erro ao processar recuperação de senha. Tente novamente."
```

---

## 8. Fluxo de Resetagem (Próxima Fase)

```
1. Usuário clica no link recebido por email
   → Vai para /resetar-senha?token=xxx

2. OU usuário digita código do WhatsApp
   → Vai para /resetar-senha?codigo=xxx

3. Página /resetar-senha valida o token/código
   → Se válido: mostra formulário de nova senha
   → Se inválido/expirado: mostra mensagem de erro

4. Usuário digita e confirma nova senha
   → Validação de força (mínimo 8 caracteres)
   → Salva no banco (hash com bcrypt)
   → Limpa tokenRecuperacao do banco

5. Redireciona para /entrar com mensagem de sucesso
   "Senha alterada com sucesso! Faça login com sua nova senha."
```

---

## 9. Componentes Reutilizáveis

### RecuperarSenhaForm

**Props:** Nenhuma (usa actions diretamente)

**Funcionalidades:**
- ✅ Máscara de telefone automática
- ✅ Detecção email vs telefone
- ✅ Validação em tempo real
- ✅ Seleção de método
- ✅ Estado de loading
- ✅ Mensagens de erro/sucesso

---

## 10. Variáveis de Ambiente

Nenhuma variável adicional necessária no momento.

**Quando implementar integração de email/WhatsApp:**
- `RESEND_API_KEY` ou `SENDGRID_API_KEY` (Email)
- `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN` (WhatsApp)

---

## 11. Checklist de Implementação

- [x] Página de recuperação de senha (`/esqueci-senha`)
- [x] Formulário com seleção de método
- [x] Validação de entrada
- [x] Ação de backend para processar recuperação
- [x] Gerar token aleatório (32 bytes em hex)
- [x] Salvar token no banco com expiração (1 hora)
- [x] Metaschema de banco para armazenar token e metadados
- [x] Rate limiting (máx 3 tentativas/hora)
- [x] Criar página de resetagem com token
- [x] Validar e aplicar nova senha
- [ ] Implementar envio por email (Resend/SendGrid)
- [ ] Implementar envio por WhatsApp (Twilio/MessageBird)
- [ ] Testes unitários
- [ ] Testes de integração

---

## 12. Arquivos Relacionados

### Recuperação de Senha

- `src/app/esqueci-senha/page.tsx` — Página inicial de recuperação
- `src/app/esqueci-senha/RecuperarSenhaForm.tsx` — Formulário com seleção de método
- `src/app/esqueci-senha/actions.ts` — Lógica de validação, geração de token e rate limiting
- `src/app/resetar-senha/page.tsx` — Página de resetagem com link do email
- `src/app/resetar-senha/ResetarSenhaForm.tsx` — Formulário de nova senha
- `src/app/resetar-senha/actions.ts` — Validação de token e atualização de senha
- `prisma/schema.prisma` — Schema com campos de token, expiração, método e rate limiting
- `prisma/migrations/20261006134126_add_password_recovery_fields/` — Migração do banco

### Login

- `src/app/entrar/page.tsx` — Página de login com link "Esqueci minha senha"
- `src/app/entrar/LoginForm.tsx` — Formulário de login

---

## 13. Referências

- OWASP: Password Reset - https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- RFC 6238: TOTP (para código de 2FA opcional)
- RFC 5234: Email validation

---

**Status:** ✅ Segunda fase implementada (geração de token, validação, rate limiting)  
**Próximo:** Implementar envio de email/WhatsApp (integração com Resend/SendGrid/Twilio)

---

## Implementação Completa

### Fluxo Completo (Fase 1 + Fase 2)

1. **Usuário clica "Esqueci minha senha"** → `/esqueci-senha`
2. **Digita e-mail/telefone** e seleciona método (email/whatsapp)
3. **Sistema**:
   - Valida entrada
   - Procura usuário no banco
   - Gera token de 32 bytes em hex (256 bits)
   - Salva token com expiração de 1 hora
   - Aplica rate limiting (max 3 tentativas/hora)
   - Retorna mensagem genérica por segurança
4. **Usuário recebe link/código** (TODO: implementar envio)
5. **Clica no link** → `/resetar-senha?token=xxx`
6. **Sistema**:
   - Valida token (presença e expiração)
   - Mostra formulário de nova senha
7. **Usuário digita e confirma** nova senha
8. **Sistema**:
   - Valida força (mín 8 caracteres)
   - Faz hash com bcryptjs
   - Atualiza senhaHash
   - Limpa campos de recovery
9. **Redireciona para `/entrar`** com mensagem de sucesso

### Segurança Implementada

✅ Tokens aleatórios (32 bytes em hex = 256 bits)
✅ Expiração de 1 hora
✅ Rate limiting (3 tentativas por hora)
✅ Sem divulgação de usuários (mensagem genérica)
✅ Validação de força de senha
✅ Hash seguro com bcryptjs
✅ Limpeza de campos após reset

### Próximas Implementações

- [ ] Integração com Resend para envio de email
- [ ] Integração com Twilio para envio de WhatsApp
- [ ] Testes unitários para token generation
- [ ] Testes integrados para fluxo completo
- [ ] Logs de auditoria para tentativas
- [ ] Dashboard de recuperações tentadas
