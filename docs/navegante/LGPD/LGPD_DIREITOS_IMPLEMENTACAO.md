# 📋 Guia de Implementação - Direitos LGPD

**Status**: Roadmap para Features Futuras  
**Data**: 2026-10-16

---

## 📑 Índice

1. [Direito de Acesso (Art. 18)](#1-direito-de-acesso-art-18)
2. [Direito de Retificação (Art. 16)](#2-direito-de-retificação-art-16)
3. [Direito de Apagamento (Art. 17)](#3-direito-de-apagamento-art-17)
4. [Direito de Portabilidade (Art. 20)](#4-direito-de-portabilidade-art-20)
5. [Audit Logging](#5-audit-logging)
6. [Rotação de Chaves](#6-rotação-de-chaves)

---

## 1. Direito de Acesso (Art. 18)

### Descrição

> "Todo titular tem direito a obter do controlador, mediante requisição, confirmação de existência ou acesso aos dados pessoais que sejam objeto de processamento"

### Implementação

#### 1.1 Endpoint `/api/navegante/dados/export`

```bash
# src/app/api/navegante/dados/export/route.ts
GET /api/navegante/dados/export
Authorization: Bearer <session-token>
Accept: application/json

Response (200):
{
  "solicitacao_id": "req-abc123",
  "data_solicitacao": "2026-10-16T16:18:27Z",
  "dados_navegante": {
    "id": "nav-xyz",
    "nome_social": "João Silva",
    "idade": 28,
    "cidade": "São Paulo",
    "bairro": "Centro",
    "estado_civil": "Casado",
    "filhos": 2
  },
  "dados_sensiveis": {
    "cor_raca": "Parda",
    "religiao": "Católica"
  },
  "dados_profissionais": {
    "escolaridade": "Superior completo",
    "situacao_profissional": "CLT",
    "renda_individual": "De R$ 3.001 a R$ 5.000",
    "renda_familiar": "De R$ 5.001 a R$ 10.000"
  },
  "consentimentos": {
    "participacao": true,
    "recomendacoes": true,
    "dados_agregados": false,
    "contato": true,
    "dados_sensiveis": true,
    "versao_termo": "2026-10-v1"
  },
  "respostas_ethos": [
    {
      "questao_id": "Q4.1",
      "resposta": ["Desenvolvimento pessoal", "Oportunidades de trabalho"],
      "atualizado_em": "2026-10-15T14:32:00Z"
    }
  ]
}
```

#### 1.2 Código de Implementação

```typescript
// src/app/api/navegante/dados/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decifrar } from "@/lib/crypto";
import { exigirSessao } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    // 1. Autenticar usuário
    const s = await exigirSessao();
    if (s.papel !== "NAVEGANTE") {
      return NextResponse.json(
        { erro: "Acesso negado" },
        { status: 403 }
      );
    }

    // 2. Buscar navegante completo
    const nav = await db.navegante.findUnique({
      where: { usuarioId: s.sub },
      include: {
        usuario: true,
        respostasEthos: true,
        dadosSensiveis: true,
        consentimentos: true,
        snapshotNavegante: true,
      },
    });

    if (!nav) {
      return NextResponse.json(
        { erro: "Navegante não encontrado" },
        { status: 404 }
      );
    }

    // 3. Desencriptar dados sensíveis
    let corRaca: string | null = null;
    let religiao: string | null = null;

    if (nav.dadosSensiveis) {
      try {
        if (nav.dadosSensiveis.racaCorCifrado) {
          corRaca = decifrar(nav.dadosSensiveis.racaCorCifrado);
        }
        if (nav.dadosSensiveis.religiaoCifrado) {
          religiao = decifrar(nav.dadosSensiveis.religiaoCifrado);
        }
      } catch (e) {
        console.error("[api/export] Falha ao desencriptar:", e);
        // Continua sem os dados sensíveis
      }
    }

    // 4. Construir resposta
    const resposta = {
      solicitacao_id: `req-${crypto.randomUUID()}`,
      data_solicitacao: new Date().toISOString(),
      dados_navegante: {
        id: nav.id,
        nome_social: nav.nomeSocial,
        idade: nav.idade,
        cidade: nav.cidade,
        bairro: nav.bairro,
        estado_civil: nav.estadoCivil,
        filhos: nav.filhos,
      },
      dados_sensiveis: {
        cor_raca: corRaca,
        religiao: religiao,
      },
      dados_profissionais: {
        escolaridade: nav.escolaridade,
        situacao_profissional: nav.situacaoProfissional,
        renda_individual: nav.rendaIndividual,
        renda_familiar: nav.rendaFamiliar,
      },
      consentimentos: nav.consentimentos.reduce(
        (acc, c) => ({
          ...acc,
          [c.tipo.toLowerCase()]: c.concedido,
          versao_termo: c.versaoTermo,
        }),
        {}
      ),
      respostas_ethos: nav.respostasEthos.map((r) => ({
        questao_id: r.questaoId,
        resposta: r.valor,
        atualizado_em: r.atualizadoEm.toISOString(),
      })),
    };

    // 5. Log de auditoria
    await db.auditLog.create({
      data: {
        usuarioId: s.sub,
        acao: "EXPORT_DADOS_PESSOAIS",
        descricao: "Navegante exportou seus dados",
        ipAddress: req.ip,
        userAgent: req.headers.get("user-agent"),
        timestamp: new Date(),
      },
    });

    // 6. Retornar JSON
    return NextResponse.json(resposta, {
      headers: {
        "Content-Disposition": `attachment; filename="meus-dados-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (e) {
    console.error("[api/export] Erro:", e);
    return NextResponse.json(
      { erro: "Erro ao exportar dados" },
      { status: 500 }
    );
  }
}
```

#### 1.3 UI no Dashboard

```tsx
// src/app/navegante/minhas-informacoes/page.tsx

export default function MinhasInformacoes() {
  return (
    <div className="space-y-6">
      <h1>Minhas Informações</h1>

      {/* Seção: Acesso aos Dados */}
      <div className="rounded-lg border border-navira-blue-300 bg-navira-blue-50 p-4">
        <h2 className="mb-2 text-lg font-semibold">📥 Acessar Meus Dados</h2>
        <p className="mb-4 text-sm">
          Baixe uma cópia de todos os seus dados pessoais em formato JSON,
          incluindo suas respostas ao questionário Ethos.
        </p>
        <button
          onClick={async () => {
            const res = await fetch("/api/navegante/dados/export");
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `meus-dados-${new Date().toISOString().split("T")[0]}.json`;
            a.click();
          }}
          className="rounded bg-navira-blue-600 px-4 py-2 text-white hover:bg-navira-blue-700"
        >
          Baixar Dados (JSON)
        </button>
      </div>

      {/* Seção: Seus Dados */}
      <div className="space-y-4">
        <div>
          <label className="font-semibold">Nome Social:</label>
          <p>{/* dados do usuário */}</p>
        </div>
        {/* Mais campos */}
      </div>
    </div>
  );
}
```

---

## 2. Direito de Retificação (Art. 16)

### Descrição

> "Todo titular tem direito a solicitar a correção de dados pessoais inexatos"

### Status Atual

✅ **JÁ IMPLEMENTADO** via formulário Ethos Bloco 1

O navegante pode:
- Acessar `/navegante/ethos?bloco=1`
- Revisar e atualizar Q1.7 (cor/raça)
- Revisar e atualizar Q1.8 (religião)
- Submeter e re-criptografar

**Código Existente**:
- `src/app/navegante/ethos/actions.ts` → `salvarBloco()` (upsert)
- `src/app/navegante/ethos/page.tsx` → carrega dados anteriores

### Melhorias Sugeridas

1. Adicionar modal de confirmação antes de atualizar dados sensíveis
2. Manter histórico de alterações em `AuditLog`
3. Notificar usuário via email após alteração

```typescript
// Após upsert em DadosSensiveis:
await db.auditLog.create({
  data: {
    usuarioId: s.sub,
    acao: "UPDATE_DADOS_SENSIVEIS",
    descricao: `Atualizou: ${Object.keys(alteracoes).join(", ")}`,
    timestamp: new Date(),
  },
});
```

---

## 3. Direito de Apagamento (Art. 17 - "Direito ao Esquecimento")

### Descrição

> "O titular pode requerer ao controlador a exclusão de dados pessoais, exceto quando há obrigação legal de guardar"

### Implementação

#### 3.1 Endpoint `/api/navegante/dados/sensiveis/delete`

```bash
DELETE /api/navegante/dados/sensiveis/delete
Authorization: Bearer <session-token>
Content-Type: application/json

Body:
{
  "confirmacao": "Tenho certeza"
}

Response (200):
{
  "sucesso": true,
  "mensagem": "Seus dados sensíveis foram deletados",
  "solicitacao_id": "req-xyz789"
}
```

#### 3.2 Código de Implementação

```typescript
// src/app/api/navegante/dados/sensiveis/delete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/session";

export async function DELETE(req: NextRequest) {
  try {
    const s = await exigirSessao();
    if (s.papel !== "NAVEGANTE") {
      return NextResponse.json(
        { erro: "Acesso negado" },
        { status: 403 }
      );
    }

    const { confirmacao } = await req.json();
    if (confirmacao !== "Tenho certeza") {
      return NextResponse.json(
        { erro: "Confirmação inválida" },
        { status: 400 }
      );
    }

    // 1. Deletar dados sensíveis
    await db.dadosSensiveis.delete({
      where: { naveganteId: s.sub },
    });

    // 2. Revogar consentimento
    await db.consentimento.updateMany({
      where: { usuarioId: s.sub, tipo: "DADOS_SENSIVEIS" },
      data: { concedido: false },
    });

    // 3. Log de auditoria
    await db.auditLog.create({
      data: {
        usuarioId: s.sub,
        acao: "DELETE_DADOS_SENSIVEIS",
        descricao: "Navegante solicitou exclusão de dados sensíveis",
        ipAddress: req.ip,
        userAgent: req.headers.get("user-agent"),
        timestamp: new Date(),
      },
    });

    // 4. Email de confirmação
    // await enviarEmailDelecao(s.email);

    return NextResponse.json({
      sucesso: true,
      mensagem: "Seus dados sensíveis foram deletados",
      solicitacao_id: `req-${crypto.randomUUID()}`,
    });
  } catch (e) {
    console.error("[api/delete] Erro:", e);
    return NextResponse.json(
      { erro: "Erro ao deletar dados" },
      { status: 500 }
    );
  }
}
```

#### 3.3 UI - Modal de Confirmação

```tsx
// src/app/navegante/minhas-informacoes/DeleteSensitiveDataModal.tsx

"use client";

import { useState } from "react";

export function DeleteSensitiveDataModal() {
  const [open, setOpen] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleDelete = async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/navegante/dados/sensiveis/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacao }),
      });

      if (res.ok) {
        alert("✅ Dados deletados com sucesso");
        setOpen(false);
      } else {
        const data = await res.json();
        alert("❌ " + data.erro);
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        🗑️ Deletar Dados Sensíveis
      </button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-96 rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">⚠️ Deletar Dados?</h2>

            <p className="mb-4 text-sm">
              Você está prestes a deletar permanentemente seus dados de cor/raça
              e religião. Esta ação não pode ser desfeita.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold">
                Digite "Tenho certeza" para confirmar:
              </label>
              <input
                type="text"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className="mt-2 w-full rounded border border-gray-300 px-3 py-2"
                placeholder="Tenho certeza"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={
                  confirmacao !== "Tenho certeza" || carregando
                }
                className="flex-1 rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50 hover:bg-red-700"
              >
                {carregando ? "Deletando..." : "Deletar Permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 4. Direito de Portabilidade (Art. 20)

### Descrição

> "Todo titular tem direito de receber seus dados pessoais em formato estruturado, comumente usado e legível por máquina"

### Implementação

O endpoint `/api/navegante/dados/export` já fornece portabilidade. Formatos adicionais:

#### 4.1 CSV

```bash
GET /api/navegante/dados/export?format=csv

Response:
campo,valor
id,nav-abc123
nome_social,João Silva
cor_raca,Parda
religiao,Católica
escolaridade,Superior completo
...
```

#### 4.2 vCard (para contatos)

```bash
GET /api/navegante/dados/export?format=vcard

Response:
BEGIN:VCARD
VERSION:3.0
FN:João Silva
TEL:+5511999999999
ORG:NAVIRA
NOTE:Cor/Raça: Parda, Religião: Católica
END:VCARD
```

#### 4.3 Código

```typescript
// src/app/api/navegante/dados/export/route.ts (estender)

export async function GET(req: NextRequest) {
  // ... autenticação ...

  const format = new URL(req.url).searchParams.get("format") || "json";

  const dados = { /* ... */ };

  switch (format) {
    case "csv":
      return exportCSV(dados);
    case "vcard":
      return exportVCard(dados);
    default:
      return exportJSON(dados);
  }
}

function exportCSV(dados: any) {
  const csv = Object.entries(dados)
    .flatMap(([key, value]) => {
      if (typeof value === "object") {
        return Object.entries(value).map(
          ([k, v]) => `${key}.${k},${JSON.stringify(v)}`
        );
      }
      return [`${key},${JSON.stringify(value)}`];
    })
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados.csv"',
    },
  });
}
```

---

## 5. Audit Logging

### Schema Prisma

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  usuarioId   String
  acao        String   // "EXPORT_DADOS", "UPDATE_DADOS_SENSIVEIS", etc.
  descricao   String?
  ipAddress   String?
  userAgent   String?
  resultado   String?  // "sucesso", "erro"
  timestamp   DateTime @default(now())

  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId])
  @@index([timestamp])
}
```

### Queries Úteis

```sql
-- Auditar todas as operações de um usuário
SELECT * FROM AuditLog 
WHERE usuarioId = 'nav-123'
ORDER BY timestamp DESC;

-- Detectar acessos suspeitos
SELECT usuarioId, COUNT(*) as tentativas 
FROM AuditLog 
WHERE acao = 'EXPORT_DADOS' 
  AND timestamp > now() - interval '1 day'
GROUP BY usuarioId 
HAVING COUNT(*) > 5;
```

---

## 6. Rotação de Chaves

### Cenário

Chave de criptografia foi comprometida. Precisa ser rotacionada.

### Processo

#### 6.1 Preparar Nova Chave

```bash
# Gerar nova chave
openssl rand -base64 32
# Output: NewKeyBase64String==

# Adicionar como variável:
DATA_ENCRYPTION_KEY_NEW="NewKeyBase64String=="
```

#### 6.2 Script de Rotação

```typescript
// scripts/rotate-encryption-key.ts

import { db } from "@/lib/db";
import {
  decifrar as decifrarAntigo,
  cifrar: cifrarNovo,
} from "@/lib/crypto";

const CHAVE_ANTIGA = process.env.DATA_ENCRYPTION_KEY_OLD;
const CHAVE_NOVA = process.env.DATA_ENCRYPTION_KEY_NEW;

if (!CHAVE_ANTIGA || !CHAVE_NOVA) {
  throw new Error("Variáveis de chave não definidas");
}

async function rotateKeys() {
  console.log("🔄 Iniciando rotação de chaves...");

  const registros = await db.dadosSensiveis.findMany();
  let sucesso = 0;
  let erros = 0;

  for (const reg of registros) {
    try {
      // Desencripta com chave antiga
      const racaCor = reg.racaCorCifrado
        ? decifrarComChave(reg.racaCorCifrado, CHAVE_ANTIGA)
        : null;
      const religiao = reg.religiaoCifrado
        ? decifrarComChave(reg.religiaoCifrado, CHAVE_ANTIGA)
        : null;

      // Re-encripta com chave nova
      const racaCorNova = racaCor ? cifrarComChave(racaCor, CHAVE_NOVA) : null;
      const religiaoCifrada = religiao
        ? cifrarComChave(religiao, CHAVE_NOVA)
        : null;

      // Atualiza banco
      await db.dadosSensiveis.update({
        where: { naveganteId: reg.naveganteId },
        data: {
          racaCorCifrado: racaCorNova,
          religiaoCifrado: religiaoCifrada,
        },
      });

      sucesso++;
    } catch (e) {
      console.error(`Erro ao rotacionar ${reg.naveganteId}:`, e);
      erros++;
    }
  }

  console.log(`✅ Rotação concluída: ${sucesso} sucesso, ${erros} erros`);
}

rotateKeys();
```

#### 6.3 Executar

```bash
# Em ambiente seguro (não produção ao vivo)
npx ts-node scripts/rotate-encryption-key.ts

# Validar
npm run test -- crypto-lgpd.test.ts

# Fazer deploy com nova chave
vercel deploy --prod
```

---

## 📋 Checklist de Implementação

### Phase 1: MVP LGPD (Atual ✅)
- [x] Criptografia AES-256-GCM
- [x] Tabela DadosSensiveis isolada
- [x] Consentimento explícito (DADOS_SENSIVEIS)
- [x] Fallback sem bloqueio
- [x] Testes de criptografia

### Phase 2: Direitos LGPD (Próximas)
- [ ] Endpoint `/api/navegante/dados/export` (Acesso)
- [ ] UI de "Minhas Informações"
- [ ] Endpoint `/api/navegante/dados/sensiveis/delete` (Apagamento)
- [ ] Modal de confirmação
- [ ] Exportação CSV/vCard (Portabilidade)

### Phase 3: Operações (Futuro)
- [ ] Audit logging completo
- [ ] Rotação de chaves automática
- [ ] Data retention policy (guardar por X anos)
- [ ] Anonimização em lote (estudos)
- [ ] Dashboard para DPO

---

## 📞 Contatos

- **Desenvolvedor Lead**: [seu-email@navira.com.br]
- **DPO (Data Protection Officer)**: [dpo@navira.com.br]
- **Security**: [security@navira.com.br]

---

**Versão**: 1.0.0  
**Data**: 2026-10-16  
**Status**: Roadmap Aprovado
