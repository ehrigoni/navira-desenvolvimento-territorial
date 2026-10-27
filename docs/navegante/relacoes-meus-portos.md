# Relações do painel "Meus portos"

Estrutura pedida em `Meus portos.docx` ("Sistema de Matching", itens 1 a 8), como ela existe no banco
(`prisma/schema.prisma`).

| # | Regra | Como está no banco |
|---|---|---|
| 1 | Uma pessoa pode possuir zero ou mais portos | `Navegante` 1—N `InscricaoPorto` N—1 `Porto` |
| 2 | O porto possui um CEP | `Porto.cep` (+ `latitude`/`longitude`) |
| 3 | A empresa está localizada em um CEP | `Destino.cep` (empresa da plataforma) · `EmpresaCnpj.cep` (base da Receita) |
| 4 | Uma empresa possui um CNAE | `Destino.cnae` · `EmpresaCnpj.cnaeCodigo` → `Cnae` |
| 5 | Uma vaga pertence a uma empresa | `Vaga.destinoId` → `Destino` |
| 6 | Um curso é ministrado por uma empresa | `Curso.instituicaoId` → `Instituicao` (instituição educadora) |
| 7 | Uma vaga pode possuir 0 ou mais requisitos de cursos | `Vaga` N—N `Curso` via `VagaCurso` |
| 8 | Uma empresa pode desenvolver 0 ou mais portos | `Destino` N—N `Porto` via `EmpresaPorto` |

Escolhas do Navegante no painel:

- **Minhas vagas** — `Navegante` N—N `Vaga` via `VagaNavegante`
- **Meus cursos** — `Navegante` N—N `Curso` via `CursoNavegante`

```mermaid
erDiagram
    Navegante ||--o{ InscricaoPorto : "1. possui portos"
    Porto ||--o{ InscricaoPorto : ""
    Porto {
        string nome
        TipoPorto tipo
        string logradouro
        string numero
        string bairro
        string cidade
        string uf
        string cep "2. CEP do porto"
    }
    Destino {
        string razaoSocial
        string cep "3. CEP da empresa"
        string cnae "4. CNAE da empresa"
    }
    EmpresaCnpj }o--|| Cnae : "4. CNAE (base da Receita)"
    EmpresaCnpj {
        string cnpj
        string cep "3. CEP (base da Receita)"
    }
    Destino ||--o{ Vaga : "5. vaga pertence à empresa"
    Instituicao ||--o{ Curso : "6. curso ministrado por"
    Vaga ||--o{ VagaCurso : "7. requisitos de cursos"
    Curso ||--o{ VagaCurso : ""
    Destino ||--o{ EmpresaPorto : "8. desenvolve portos"
    Porto ||--o{ EmpresaPorto : ""
    Navegante ||--o{ VagaNavegante : "minhas vagas"
    Vaga ||--o{ VagaNavegante : ""
    Navegante ||--o{ CursoNavegante : "meus cursos"
    Curso ||--o{ CursoNavegante : ""
```

## Matching (`src/lib/matching.ts`)

- **Compatibilidade com o Ethos**: % dos valores que o Navegante marcou na Q4.1 ("O que você mais valoriza")
  que a vaga/curso também declara em `valoresEthos` (mesmas opções da Q4.1).
- **Proximidade com os portos**: menor distância entre o local da vaga/curso e os portos do Navegante.
  A vaga usa a coordenada própria ou, na falta, a da empresa.
- **Nota da vaga** (0–100): Ethos 50% · proximidade 35% · cursos exigidos que a pessoa já escolheu 15%.
- **Nota do curso** (0–100): compatibilidade com vagas 40% (exigido por uma das minhas vagas = total;
  por alguma vaga da plataforma = metade) · Ethos 30% · proximidade 30% (curso remoto conta como próximo).
- **"Todas as vagas/cursos de todos os portos"**: tudo o que fica a até 15 km de algum porto (e cursos remotos).

## [Matching-Navegante] e painel de Vagas (`src/lib/matching-navegante.ts`)

Regras de `matchingVagas.docx`:

- **Perfil JSON** (`MatchingNavegante.perfil`): valores (Q4.1), ambientes (Q7.3), profissão (Q7.1) e escolaridade (Q1.9)
  do Ethos; portos inscritos (CEP e coordenadas); cursos escolhidos e cursos realizados.
- **Quando é gravado**: depois de salvar um bloco do Ethos, mudar portos ou incluir/editar/excluir/escolher cursos.
  A `assinatura` (SHA-256 do JSON) evita regravar quando nada mudou.
- **Vagas do painel**: vagas ativas de empresas a até 15 km dos portos do Navegante (todas, se ele não tem portos),
  da mais para a menos compatível.
- **Índice de compatibilidade** (0–100): Ethos 35% · proximidade da empresa aos portos 30% ·
  CNAEs da empresa (principal e secundários, da consulta do CNPJ) × ambientes da Q7.3 20% (`DIVISOES_CNAE_POR_AMBIENTE`) · cursos exigidos já feitos ou escolhidos 15%.
- Campos da vaga em branco não aparecem.

## Cursos publicados por empresas e painel de Cursos (`publicacaoCursos.docx`)

- **[Especificacao-Curso]** (`src/lib/curso-spec.ts`): curso, descrição/conteúdo, carga horária, instituição de ensino,
  data de realização e modalidade (Presencial → `PRESENCIAL`, Online → `REMOTA`, Ambos → `HIBRIDA`). Vale para os
  cursos realizados do Navegante e para os cursos publicados pelas empresas.
- **Empresa publica cursos**: `Curso.destinoId` (a empresa) + `Curso.instituicaoEnsino` (nome informado). Cursos de
  instituições continuam em `Curso.instituicaoId`. Presencial/Ambos usam o endereço da empresa.
- **Painel Cursos do Navegante**: cursos ligados às 5 vagas de maior matching — exigidos por elas ou publicados pelas
  empresas delas —, ordenados pelo índice da vaga. Cursos que o Navegante já realizou não aparecem.

## [Matching-Empresa] (`src/lib/matching-empresa.ts`)

- **Perfil JSON** (`MatchingEmpresa.perfil`): razão social, CNPJ, CNAEs (principal e secundários) e os ambientes da
  Q7.3 que combinam com eles; local (CEP e coordenadas); portos que a empresa desenvolve e portos a até 15 km;
  vagas ativas com os cursos exigidos e os 5 cursos mais compatíveis; cursos publicados com as vagas que mais combinam.
- **Nota curso × vaga** (0–100): exigido pela vaga = 100; senão valores do Ethos em comum 60% · proximidade 25%
  (online conta como próximo) · curso da própria empresa 15%.
- **Quando é gravado**: ao salvar os dados da empresa e também ao publicar/remover vagas e cursos ou mudar os portos
  que desenvolve. A `assinatura` (SHA-256 do JSON) evita regravar quando nada mudou.
