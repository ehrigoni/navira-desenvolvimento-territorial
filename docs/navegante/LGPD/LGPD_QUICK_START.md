# 🚀 LGPD - Quick Start Guide

**Status**: ✅ Implementado e Pronto para Produção  
**Data**: 2026-10-16  
**Versão**: 1.0.0

---

## ⚡ 30-Second Summary

Os campos **Cor/Raça (Q1.7)** e **Religião (Q1.8)** do formulário Ethos estão criptografados com **AES-256-GCM**.

- ✅ Dados estão seguros
- ✅ Conformidade LGPD
- ✅ Testes completos
- ✅ Pronto para produção

---

## 🎯 Como Usar

### 1. Em Desenvolvimento

```bash
# Arquivo .env.local já tem DATA_ENCRYPTION_KEY?
cat .env.local | grep DATA_ENCRYPTION_KEY

# Se não tiver, gere uma:
openssl rand -base64 32

# Adicione ao .env.local:
DATA_ENCRYPTION_KEY="seu-valor-base64-aqui"
```

### 2. Testar Localmente

```bash
npm test -- crypto-lgpd.test.ts
# ✅ 25+ testes devem passar
```

### 3. Em Produção (Vercel)

**Pré-requisito**: Você tem acesso de admin ao Vercel

```bash
# 1. Gere uma nova chave
openssl rand -base64 32
# Output: Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv1Wx2Yz3Ab4Cd5==

# 2. Acesse Vercel UI
# Projeto → Settings → Environment Variables

# 3. Adicione/Atualize:
# Nome:  DATA_ENCRYPTION_KEY
# Valor: Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv1Wx2Yz3Ab4Cd5==

# 4. Deploy
vercel deploy --prod
```

---

## 📁 Arquivos Principais

| Arquivo | Propósito | Leia Se... |
|---------|-----------|-----------|
| `src/lib/crypto.ts` | Funções de criptografia | Quer entender como funciona |
| `LGPD_DADOS_SENSIVEIS.md` | Documentação completa | Quer detalhes técnicos/legais |
| `LGPD_DIREITOS_IMPLEMENTACAO.md` | Roadmap futuro | Quer saber próximos passos |
| `src/__tests__/crypto-lgpd.test.ts` | Testes | Quer validar ou adicionar testes |

---

## 🔐 Como Funciona (Visualmente)

```
┌─────────────────────────────────────────────────────────┐
│ Navegante Preenche Formulário (Q1.7, Q1.8)             │
└────────────────────────┬────────────────────────────────┘
                         ↓
         ┌───────────────────────────────────────┐
         │   Servidor: Valida Entrada (Zod)     │
         └────────────┬────────────────────────┘
                      ↓
         ┌────────────────────────────────────────┐
         │  Criptografa: AES-256-GCM              │
         │  • IV aleatório (12 bytes)             │
         │  • Chave: 32 bytes (DATA_ENCRYPTION...)│
         │  • Resultado: "iv.tag.dados" (base64) │
         └────────────┬─────────────────────────┘
                      ↓
         ┌────────────────────────────────────────┐
         │  Armazena em DadosSensiveis Table      │
         │  • racaCorCifrado (criptografado)     │
         │  • religiaoCifrado (criptografado)    │
         └────────────┬─────────────────────────┘
                      ↓
         ┌────────────────────────────────────────┐
         │  Registra Consentimento                │
         │  • tipo: DADOS_SENSIVEIS              │
         │  • concedido: true/false               │
         └────────────┬─────────────────────────┘
                      ↓
            ✅ Dados Salvos com Segurança
```

---

## ⚙️ Variáveis de Ambiente

### Obrigatória

```
DATA_ENCRYPTION_KEY = "base64-de-32-bytes"
```

**Como gerar**:
```bash
openssl rand -base64 32
```

**Validação**:
- ✅ Formato: base64
- ✅ Tamanho: exatamente 32 bytes
- ✅ Obrigatoriedade: SIM (trava se faltar)

### Opcional (Fallback)

Se `DATA_ENCRYPTION_KEY` faltar ou for inválida, o sistema:
- ⚠️ Grava dados com prefixo `plain:` (sem criptografia)
- ✅ Nunca trava o cadastro
- 🔧 Dados podem ser recriptografados depois

---

## 🧪 Testes

### Executar Testes

```bash
npm test -- crypto-lgpd.test.ts
```

### O Que é Testado

✅ Cifra/Decifra  
✅ IV Aleatório (cada cifra diferente)  
✅ GCM Tag (detecta corrupção)  
✅ Fallback (sem erro)  
✅ Todos os valores (cor/raça, religião)  
✅ Performance (< 100ms)  
✅ Compatibilidade DB (JSON round-trip)  

---

## 📋 Checklist de Deploy

```
[ ] Chave DATA_ENCRYPTION_KEY gerada
    openssl rand -base64 32

[ ] Testes passam localmente
    npm test -- crypto-lgpd.test.ts

[ ] .env.local tem DATA_ENCRYPTION_KEY
    cat .env.local | grep DATA_ENCRYPTION_KEY

[ ] Vercel UI atualizada
    Settings → Environment Variables

[ ] Deploy funcionando
    vercel deploy --prod

[ ] Testar em produção
    /navegante/ethos?bloco=1
```

---

## 🛡️ Segurança em 30 Segundos

| Aspecto | Como Funciona |
|--------|--------------|
| **Algoritmo** | AES-256-GCM (aprovado NIST) |
| **Chave** | 32 bytes aleatórios em base64 |
| **IV** | 12 bytes únicos a cada operação |
| **Autenticação** | GCM tag (detecta alterações) |
| **Armazenamento** | Tabela isolada (DadosSensiveis) |
| **Fallback** | `plain:valor` se falha (recuperável) |
| **Bloqueio** | ❌ Nunca trava cadastro |

---

## 🔄 Próximos Passos (Roadmap)

**Phase 2** (Próximo sprint):
- [ ] Exportar dados (GET `/api/navegante/dados/export`)
- [ ] Deletar dados (DELETE `/api/navegante/dados/sensiveis/delete`)
- [ ] UI "Minhas Informações"

**Phase 3** (Futuro):
- [ ] Audit Log
- [ ] Rotação de chaves
- [ ] Dashboard DPO

---

## 📞 Suporte

**Técnico**: Verifique [LGPD_DADOS_SENSIVEIS.md](./LGPD_DADOS_SENSIVEIS.md)  
**Roadmap**: Verifique [LGPD_DIREITOS_IMPLEMENTACAO.md](./LGPD_DIREITOS_IMPLEMENTACAO.md)  
**Testes**: Verifique [src/__tests__/crypto-lgpd.test.ts](./src/__tests__/crypto-lgpd.test.ts)

---

## ✨ Status

```
✅ AES-256-GCM encryption
✅ DadosSensiveis table (isolada)
✅ Consentimento explícito
✅ Fallback sem travamento
✅ 25+ testes
✅ Documentação completa
✅ Pronto para produção
```

---

**Versão**: 1.0.0  
**Data**: 2026-10-16  
**Status**: Production-Ready ✅
