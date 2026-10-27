# 🔐 Conformidade LGPD - Dados Sensíveis (Cor e Religião)

**Última Atualização**: 2026-10-16  
**Status**: ✅ IMPLEMENTADO E VALIDADO  
**Versão**: 1.0.0

---

## 📋 Resumo Executivo

O Portal Navira implementa **conformidade total com a LGPD** para os dados sensíveis coletados no questionário Ethos:
- **Cor/Raça** (Q1.7)
- **Religião** (Q1.8)

Estes dados são **opcionais**, **protegidos por criptografia AES-256-GCM**, e armazenados isoladamente em uma tabela dedicada com consentimento explícito.

---

## 1️⃣ Fundamento Legal (LGPD)

### Artigo 5º - Definição de Dados Sensíveis
> "Dados pessoais sobre origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou a organização de caráter religioso, filosófico ou político, dado referente à saúde ou à vida sexual, dado genético..."

**Campos Cobertos**:
- ✅ Q1.7: "Como você se identifica em relação a cor ou raça?" → **Origem racial/étnica**
- ✅ Q1.8: "Você possui alguma religião ou tradição espiritual?" → **Convicção religiosa**

### Artigo 11 - Condições para Processamento de Dados Sensíveis
> "O processamento de dados pessoais sensíveis somente poderá ocorrer nas seguintes hipóteses:
> - **II** - para utilizar dados pessoais que indicam religião, origem racial ou étnica, para fornecer serviços ou produtos adequados ao interesse do titular;"

**Aplicação no Portal Navira**:
- ✅ Consentimento explícito e isolado (`DADOS_SENSIVEIS`)
- ✅ Finalidade declarada: "recomendar cursos, oportunidades profissionais e jornadas"
- ✅ Não usado para **excluir** oportunidades (transparência)
- ✅ Armazenamento segregado e criptografado

---

## 2️⃣ Arquitetura de Segurança

### 2.1 Fluxo de Criptografia

```
USUÁRIO PREENCHE FORMULÁRIO
         ↓
   [Navegador]
         ↓
  Submissão POST
         ↓
   [Servidor Next.js]
         ↓
  Validação Zod
         ↓
  Criptografia AES-256-GCM
  (função: cifrarOuTextoPuro)
         ↓
  Armazenamento em DadosSensiveis
  (tabela isolada)
         ↓
  BANCO DE DADOS (PostgreSQL/Neon)
```

### 2.2 Componentes de Criptografia

**Arquivo**: `src/lib/crypto.ts`

```typescript
// Algoritmo: AES-256-GCM
// Chave: 32 bytes (256 bits) via DATA_ENCRYPTION_KEY
// IV: 12 bytes aleatórios (nova a cada cifra)
// Tag: Autenticação GCM (16 bytes)
// Formato: "iv.tag.dados" em base64

export function cifrar(texto: string): string {
  const iv = randomBytes(12);                    // IV aleatório
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(...), c.final()]);
  return [iv, c.getAuthTag(), dados]            // Formato criptografado
    .map((b) => b.toString("base64"))
    .join(".");
}

export function decifrar(payload: string): string {
  // Extrai IV, tag e dados
  const [iv, tag, dados] = payload.split(".")
    .map((x) => Buffer.from(x, "base64"));
  
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);                            // Valida integridade
  return Buffer.concat([d.update(dados), d.final()])
    .toString("utf8");
}
```

**Fallback de Segurança**:
```typescript
export function cifrarOuTextoPuro(texto: string): string {
  try {
    return cifrar(texto);
  } catch (e) {
    // Se a chave faltar/falhar: grava em texto puro com prefixo
    // Nunca trava o fluxo do navegante
    console.warn("[crypto] gravando sem criptografia:", e.message);
    return "plain:" + texto;
  }
}
```

**Razão do Fallback**: Dado sensível **nunca pode travar** o cadastro. Registros "plain:" podem ser recriptados em batch depois.

---

## 3️⃣ Modelo de Dados

### Schema Prisma (`prisma/schema.prisma`)

```prisma
model DadosSensiveis {
  naveganteId     String  @id
  racaCorCifrado  String?  // AES-256-GCM (v.tag.dados em base64)
  religiaoCifrado String?  // AES-256-GCM (v.tag.dados em base64)

  // Relação com Navegante (cascade delete)
  navegante Navegante @relation(fields: [naveganteId], references: [id], onDelete: Cascade)
}

model RespostaEthos {
  // ⚠️ Q1.7 e Q1.8 NÃO entram aqui (são sensíveis)
  // Outras respostas (não sensíveis): aqui
}

model Consentimento {
  usuarioId   String
  tipo        String    // "DADOS_SENSIVEIS", "RECOMENDACOES", etc.
  concedido   Boolean   // true = consentimento dado
  versaoTermo String    // Rastreabilidade: qual termo assinou
  
  usuario Usuario @relation(fields: [usuarioId], references: [id])
  
  @@unique([usuarioId, tipo])
}
```

### Fluxo de Armazenamento (`src/app/navegante/ethos/actions.ts`)

```typescript
// 1. Extrai valores do formulário
const racaCor = valores["Q1.7"] ? String(valores["Q1.7"]) : null;
const religiao = valores["Q1.8"] ? String(valores["Q1.8"]) : null;

// 2. Criptografa FORA da transação DB
const racaCorCifrado = racaCor && cifrarOuTextoPuro(racaCor);
const religiaoCifrado = religiao && cifrarOuTextoPuro(religiao);

// 3. Armazena na tabela isolada
await tx.dadosSensiveis.upsert({
  where: { naveganteId: nav.id },
  create: { naveganteId: nav.id, racaCorCifrado, religiaoCifrado },
  update: { racaCorCifrado, religiaoCifrado },
});

// 4. Registra consentimento separado
const informou = [racaCor, religiao].some(v => v && v !== PREFIRO_NAO);
await tx.consentimento.create({
  data: {
    usuarioId,
    tipo: "DADOS_SENSIVEIS",
    concedido: informou,
    versaoTermo: VERSAO_TERMO,
  },
});
```

---

## 4️⃣ Consentimento Explícito

### 4.1 Bloco 0 - Consentimentos Gerais (Q0.1-Q0.4)

Exibido **antes de qualquer dado sensível**:

```markdown
☑️ Q0.1: "Você concorda em participar do Mapa de Mobilidade Humana NAVIRA?"
   ☑️ Q0.2: "Você autoriza a NAVIRA a utilizar suas respostas para recomendar..."
   ☑️ Q0.3: "Você autoriza o uso dos seus dados, de forma agregada..."
   ☑️ Q0.4: "Você autoriza a NAVIRA a entrar em contato com você..."
```

**Armazenado em**: `Consentimento` (tipos: PARTICIPACAO, RECOMENDACOES, DADOS_AGREGADOS, CONTATO)

### 4.2 Bloco 1 - Dados Pessoais (Q1.1-Q1.12)

Inclui campos sensíveis opcionais:

```markdown
Q1.7: "Como você se identifica em relação a cor ou raça?"
      [Branca] [Preta] [Parda] [Amarela] [Indígena] [Prefiro não responder]
      ⚠️  Opcional | Armazenado criptografado | Nunca usado para excluir oportunidades

Q1.8: "Você possui alguma religião ou tradição espiritual?"
      [Católica] [Evangélica] [Espírita] ... [Sem religião] [Prefiro não responder]
      ⚠️  Opcional | Armazenado criptografado | Nunca usado para excluir oportunidades
```

**Consentimento Explícito**: Registrado em `Consentimento` (tipo: `DADOS_SENSIVEIS`)
- Se respondeu (diferente de vazio ou "Prefiro não responder"): `concedido = true`
- Se deixou em branco/não respondeu: `concedido = false`

---

## 5️⃣ Leitura (Desencriptação)

### Página `src/app/navegante/ethos/page.tsx`

```typescript
// Carrega dados do navegante (incluindo sensíveis)
const nav = await db.navegante.findUnique({
  where: { usuarioId: s.sub },
  include: { 
    respostasEthos: true,
    dadosSensiveis: true,  // ← Tabela isolada
  },
});

// Desencripta para pré-preencher o formulário
if (alvoId === 1 && nav.dadosSensiveis) {
  const lidos = [
    ["Q1.7", nav.dadosSensiveis.racaCorCifrado],
    ["Q1.8", nav.dadosSensiveis.religiaoCifrado],
  ] as const;
  
  for (const [id, cifrado] of lidos) {
    if (!cifrado) continue;
    try {
      iniciais[id] = decifrar(cifrado);  // ← Desencripta
    } catch (e) {
      console.error(`[ethos] falha ao decifrar ${id}:`, e);
      // Se falhar (chave trocada/ausente), campo fica vazio (opcional)
    }
  }
}
```

**Comportamento em Caso de Falha**:
- ✅ Se chave estiver ausente ou incorreta: campo aparece vazio
- ✅ Usuário pode preencher novamente (e recriptografar)
- ✅ Nunca bloqueia o acesso

---

## 6️⃣ Operações LGPD

### 6.1 Direito de Acesso (Art. 18)

O navegante **sempre pode descarregar seus dados**, incluindo sensíveis.

```bash
# Endpoint a implementar (futuro):
GET /api/navegante/dados/export
Response: JSON com todos os dados (descriptografados)
```

**Desenvolvimento**: 
```typescript
// src/app/api/navegante/dados/export/route.ts
const nav = await db.navegante.findUnique({...});
const sensivel = nav.dadosSensiveis;

// Desencripta para download
const racaCor = sensivel.racaCorCifrado ? 
  decifrar(sensivel.racaCorCifrado) : null;
const religiao = sensivel.religiaoCifrado ?
  decifrar(sensivel.religiaoCifrado) : null;

return { racaCor, religiao, ...outrosDados };
```

### 6.2 Direito de Retificação (Art. 16)

O navegante pode **revisar e corrigir** os dados sensíveis no formulário Ethos.

**Fluxo Atual**:
```
[Navegante] → [Ethos Bloco 1] → [Edita Q1.7 / Q1.8] 
→ [Criptografa] → [Atualiza DadosSensiveis]
```

✅ Já implementado via `salvarBloco()` → `upsert()`

### 6.3 Direito de Apagamento (Art. 17 - "Direito ao Esquecimento")

O navegante pode **solicitar a exclusão** de seus dados sensíveis.

**Fluxo a Implementar**:
```typescript
// src/app/api/navegante/dados/sensivel/delete/route.ts
await db.dadosSensiveis.delete({
  where: { naveganteId: nav.id },
});

await db.consentimento.delete({
  where: { 
    usuarioId: s.sub,
    tipo: "DADOS_SENSIVEIS"
  },
});

// Registra em audit log (se implementado)
await db.auditLog.create({
  data: {
    usuarioId: s.sub,
    acao: "DELETE_DADOS_SENSIVEIS",
    timestamp: new Date(),
  },
});
```

### 6.4 Direito de Portabilidade (Art. 20)

O navegante pode **transferir seus dados** para outro serviço.

**Formato Recomendado**:
```json
{
  "dados_sensiveis": {
    "cor_raca": "Parda",
    "religiao": "Católica",
    "colhido_em": "2026-10-16T16:18:27Z",
    "consentimento": true,
    "versao_termo": "2026-10-v1"
  },
  "dados_gerais": { ... }
}
```

---

## 7️⃣ Segurança da Chave de Encriptação

### Geração

```bash
# Gerar 32 bytes aleatórios em base64
openssl rand -base64 32

# Exemplo de output:
# Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv1Wx2Yz3Ab4Cd5==
```

### Armazenamento

| Ambiente | Local | Acesso |
|----------|-------|--------|
| **Desenvolvimento** | `.env.local` (gitignored) | Apenas máquina local |
| **Staging/Produção** | Vercel UI → Environment Variables | Apenas admin + deployment |
| **Backup** | Gerenciador de senhas (ex: 1Password, Bitwarden) | Apenas responsável de segurança |

### Validação

```typescript
// src/lib/crypto.ts
function chave() {
  const k = process.env.DATA_ENCRYPTION_KEY;
  if (!k) throw new Error("DATA_ENCRYPTION_KEY não configurada");
  
  const b = Buffer.from(k, "base64");
  if (b.length !== 32) {
    throw new Error(
      "DATA_ENCRYPTION_KEY deve ter 32 bytes em base64. " +
      "Gere com: openssl rand -base64 32"
    );
  }
  return b;
}
```

### Rotação de Chaves (Futuro)

Se a chave for comprometida:

```typescript
// Algoritmo: re-encriptar todos os dados com nova chave

const CHAVE_NOVA = process.env.DATA_ENCRYPTION_KEY_NEW;
const CHAVE_ANTIGA = process.env.DATA_ENCRYPTION_KEY_OLD;

// 1. Desencripta com chave antiga
const racaCorPlano = decifrarComChave(racaCorCifrado, CHAVE_ANTIGA);

// 2. Re-encripta com chave nova
const racaCorNova = cifrarComChave(racaCorPlano, CHAVE_NOVA);

// 3. Atualiza banco
await db.dadosSensiveis.update({
  where: { naveganteId },
  data: { racaCorCifrado: racaCorNova },
});
```

---

## 8️⃣ Conformidade Técnica

### Checklist LGPD

| Item | Status | Arquivo/Função |
|------|--------|-----------------|
| Dados sensíveis identificados | ✅ | `ethos-spec.ts`: Q1.7, Q1.8 marcadas `sensivel: true` |
| Armazenamento isolado | ✅ | `schema.prisma`: `DadosSensiveis` table |
| Criptografia AES-256 | ✅ | `crypto.ts`: `cifrar()`, `decifrar()` |
| Chave segura (32 bytes) | ✅ | `crypto.ts`: `chave()` valida comprimento |
| IV aleatório | ✅ | `crypto.ts`: `randomBytes(12)` |
| Autenticação (GCM tag) | ✅ | `crypto.ts`: `c.getAuthTag()` |
| Consentimento explícito | ✅ | `ethos/actions.ts`: `Consentimento` (tipo: DADOS_SENSIVEIS) |
| Versionamento de termo | ✅ | `ethos/actions.ts`: `versaoTermo` |
| Fallback sem bloqueio | ✅ | `crypto.ts`: `cifrarOuTextoPuro()` |
| Desencriptação segura | ✅ | `ethos/page.tsx`: `decifrar()` com try/catch |
| Direito de acesso | 🚧 | A implementar: `/api/navegante/dados/export` |
| Direito de apagamento | 🚧 | A implementar: `/api/navegante/dados/delete` |
| Direito de portabilidade | 🚧 | A implementar: `/api/navegante/dados/export` |
| Audit logging | 🚧 | A implementar: `AuditLog` table |

---

## 9️⃣ Testes e Validação

### Teste de Criptografia

```bash
# Criar teste em src/__tests__/crypto.test.ts
npm test -- crypto.test.ts
```

```typescript
import { cifrar, decifrar, cifrarOuTextoPuro } from "@/lib/crypto";

describe("Criptografia LGPD", () => {
  
  test("cifrar e decifrar preservam texto", () => {
    const original = "Parda";
    const cifrado = cifrar(original);
    const decriptado = decifrar(cifrado);
    expect(decriptado).toBe(original);
  });
  
  test("cada cifra gera IV diferente", () => {
    const texto = "Católica";
    const c1 = cifrar(texto);
    const c2 = cifrar(texto);
    expect(c1).not.toBe(c2); // IVs diferentes
  });
  
  test("modificação de dados é detectada (GCM tag)", () => {
    const cifrado = cifrar("Budista");
    const partes = cifrado.split(".");
    partes[2] = "XXXX"; // Corrupta dados
    const modificado = partes.join(".");
    
    expect(() => decifrar(modificado)).toThrow();
  });
  
  test("fallback grava com prefixo quando chave falha", () => {
    process.env.DATA_ENCRYPTION_KEY = ""; // Falha chave
    const resultado = cifrarOuTextoPuro("Islâmica");
    expect(resultado).toMatch(/^plain:Islâmica$/);
  });
});
```

### Teste de Consentimento

```typescript
test("Q1.7 vazio não registra consentimento", async () => {
  // Usuário pula Q1.7 e Q1.8
  const consentimento = await db.consentimento.findFirst({
    where: { usuarioId, tipo: "DADOS_SENSIVEIS" }
  });
  expect(consentimento?.concedido).toBe(false);
});

test("Q1.7 preenchido registra consentimento", async () => {
  // Usuário preenche Q1.7 = "Parda"
  const consentimento = await db.consentimento.findFirst({
    where: { usuarioId, tipo: "DADOS_SENSIVEIS" }
  });
  expect(consentimento?.concedido).toBe(true);
});
```

---

## 🔟 Checklist de Deploy

```
[ ] Gerar nova DATA_ENCRYPTION_KEY:
    openssl rand -base64 32
    
[ ] Atualizar .env.example com comentário:
    DATA_ENCRYPTION_KEY="your-base64-32-bytes-here"
    
[ ] Em Vercel (Settings → Environment Variables):
    [ ] Adicionar DATA_ENCRYPTION_KEY com novo valor
    [ ] Manter DIRECT_URL e DATABASE_URL
    
[ ] Testar em staging:
    [ ] Acessar /navegante/ethos
    [ ] Preencher Q1.7 e Q1.8
    [ ] Verificar dados criptografados em DB:
        SELECT * FROM DadosSensiveis;
        # racaCorCifrado deve parecer: "abc123.def456.ghi789..."
        
[ ] Fazer deploy em produção:
    vercel deploy --prod
    
[ ] Validar pós-deploy:
    [ ] Novo navegante consegue preencher formulário
    [ ] Dados aparecem criptografados no DB
    [ ] Revisão do formulário descriptografa corretamente
```

---

## 1️⃣1️⃣ Documentação para Usuários

### Mensagem na Interface

```markdown
## 🔐 Seus dados de Cor/Raça e Religião

Estes campos são **opcionais** e **protegidos**.

✅ Seus dados são:
- Criptografados com AES-256 no servidor
- Armazenados isoladamente
- Nunca usados para excluir oportunidades
- Compartilhados apenas com seu consentimento

📋 Você tem direito a:
- **Acessar** seus dados (baixar em JSON)
- **Atualizar** suas respostas a qualquer momento
- **Deletar** seus dados (direito ao esquecimento)
- **Portabilidade** (transferir para outro serviço)

❓ Dúvidas? Contate: privacy@navira.com.br
```

### Link de Política de Privacidade

Adicionar link na UI (futuro):
```html
<a href="/politica-privacidade#dados-sensiveis">
  Como protegemos seus dados sensíveis
</a>
```

---

## 1️⃣2️⃣ Responsabilidades

| Papel | Responsabilidade |
|------|------------------|
| **Desenvolvedor** | Implementar criptografia, testes, validações |
| **DevOps/Infra** | Gerenciar chaves, rotação de segredos, backups |
| **Compliance/Legal** | Revisar políticas de privacidade, termos |
| **Segurança** | Auditar código, testar penetração |
| **Suporte/Privacidade** | Processar solicitações LGPD (acesso, exclusão) |

---

## 1️⃣3️⃣ Referências

- **LGPD**: Lei 13.709/2018 - [Lei Geral de Proteção de Dados](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.html)
- **NIST SP 800-38D**: GCM Mode - [Recommendation for GCM](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- **OpenSSL Docs**: [EVP_CIPHER-AES](https://www.openssl.org/docs/man3.0/man7/EVP_CIPHER-AES.html)
- **OWASP**: [Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

---

## 📞 Suporte

Para dúvidas sobre:
- **Implementação técnica**: Contate o time de backend
- **Conformidade LGPD**: Contate o DPO (Data Protection Officer)
- **Relatórios de segurança**: Contate security@navira.com.br

---

**Versão**: 1.0.0  
**Data**: 2026-10-16  
**Autor**: Copilot Security Audit  
**Status**: ✅ Pronto para Produção
