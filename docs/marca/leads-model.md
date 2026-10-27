# Modelo de Leads (Oportunidades de Negócio)

## Objetivo

Capturar e rastrear oportunidades de negócio com potenciais agentes (PORTO, TRILHA, DESTINO, APOIADOR) que desejam integrar a plataforma NAVIRA.

## Estrutura de Dados

### Lead

Tabela principal que armazena informações do lead (oportunidade de negócio).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | UUID | ✅ | Identificador único |
| nome | String | ✅ | Nome da instituição/empresa |
| email | String | ❌ | E-mail institucional |
| telefone | String | ✅ | Telefone para contato |
| tipoAgente | Papel | ✅ | PORTO, TRILHA, DESTINO ou APOIADOR |
| status | StatusLead | ✅ | Estado do lead no funil de vendas |
| localizacao | String | ❌ | Bairro ou cidade onde funciona |
| descricaoOrgao | String | ❌ | Descrição da instituição/empresa |
| motivacao | String | ❌ | Por que quer participar da NAVIRA |
| contatoNome | String | ❌ | Nome do responsável/gestor |
| contatoTelefone | String | ❌ | Telefone pessoal do responsável |
| contatoEmail | String | ❌ | E-mail pessoal do responsável |
| criadoEm | DateTime | ✅ | Data/hora de criação |
| atualizadoEm | DateTime | ✅ | Data/hora de última atualização |
| proximoContato | DateTime | ❌ | Data/hora do próximo contato programado |
| observacoes | String | ❌ | Notas internas sobre o lead |

### StatusLead (Enum)

Estados pelos quais um lead passa no funil de vendas:

- **NOVO**: Lead recém-capturado, sem contato inicial
- **CONTATADO**: Primeiro contato feito, aguardando resposta
- **QUALIFICADO**: Lead validado como oportunidade real
- **PROPOSTA_ENVIADA**: Proposta comercial enviada
- **NEGOCIACAO**: Em negociação ativa
- **GANHO**: Lead convertido em usuário ativo (PORTO, TRILHA, DESTINO ou APOIADOR)
- **PERDIDO**: Lead encerrado (sem interesse)
- **DESCARTADO**: Lead descartado por falta de qualificação

### RespostaLead

Tabela de respostas do questionário de lead. Armazena respostas às perguntas do questionário baseado no tipoAgente.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| id | UUID | ✅ | Identificador único |
| leadId | UUID | ✅ | FK referenciando Lead |
| blocoId | String | ✅ | Identificador do bloco (ex: "0", "1", "2") |
| questaoId | String | ✅ | Identificador da questão (ex: "Q1.1", "Q2.3") |
| valor | String | ✅ | Resposta em formato JSON String |
| respondidoEm | DateTime | ✅ | Data/hora da resposta |

**Constraint exclusivo**: Um lead pode ter apenas UMA resposta por questão.

## Fluxo de Lead

1. **Captura** → Lead é criado com status NOVO
2. **Contato** → Status muda para CONTATADO
3. **Qualificação** → Lead preenche questionário, status muda para QUALIFICADO
4. **Proposta** → Proposta enviada, status = PROPOSTA_ENVIADA
5. **Negociação** → Negociação em andamento, status = NEGOCIACAO
6. **Conversão** → Lead se cadastra como usuário, status = GANHO

## Índices e Performance

- `(status, tipoAgente)`: Permite filtrar leads por status e tipo de agente (para dashboards)
- `(email)`: Busca rápida por e-mail
- `(telefone)`: Busca rápida por telefone
- `(leadId, blocoId)`: Busca rápida de respostas por lead e bloco

## Integração com Fluxos

### Por Tipo de Agente

Cada tipo de agente tem um questionário customizado:

- **PORTO**: Perguntas sobre localização, tipo de organização, capacidade de participação
- **TRILHA**: Perguntas sobre instituição de ensino, cursos disponíveis, público-alvo
- **DESTINO**: Perguntas sobre empresa, vagas disponíveis, mercado
- **APOIADOR**: Perguntas sobre investimento social, motivações, área de impacto

### Dashboard de Leads

Cada papel com permissão de gerenciar leads verá um dashboard com:

- Leads por status
- Leads por tipo de agente
- Leads contatados vs. não contatados
- Taxa de conversão
- Próximos contatos programados
- Histórico de respostas

## Exemplo de Uso

```typescript
// Criar novo lead
const lead = await db.lead.create({
  data: {
    nome: "Escola Municipal X",
    telefone: "11912345678",
    email: "contato@escolamun.edu.br",
    tipoAgente: "TRILHA",
    status: "NOVO",
    contatoNome: "Maria Silva",
    contatoEmail: "maria@escolamun.edu.br",
  }
});

// Adicionar resposta
await db.respostaLead.create({
  data: {
    leadId: lead.id,
    blocoId: "1",
    questaoId: "Q1.1",
    valor: JSON.stringify({ resposta: "Escola com 500 alunos" })
  }
});

// Listar leads qualificados
const leadsQualificados = await db.lead.findMany({
  where: { 
    status: "QUALIFICADO",
    tipoAgente: "TRILHA"
  },
  include: { respostas: true }
});
```
