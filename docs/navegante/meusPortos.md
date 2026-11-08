# Painel “Meus Portos”

Conversão de `meusPortos.docx` para Markdown.

## Portos

Cada porto é composto pelas seguintes informações:

- Nome do porto
- Tipo do porto (igreja, colégio ou associação)
- Rua
- Número
- Bairro
- Cidade
- Estado
- CEP

O sistema apresenta um campo de texto para preenchimento dos dados do porto e, à medida que a pessoa digita, completa as informações faltantes. Quando o campo estiver relativamente completo, a pessoa confirma o porto com Enter. O porto aparece abaixo do campo e é armazenado no banco de dados. A pessoa pode repetir o processo quantas vezes desejar.

Os portos são apresentados em um mapa por padrão. Também há um botão para apresentar todos os portos no mapa.

## Vagas

Cada vaga é composta pelas seguintes informações:

- Nome da vaga
- Nome da empresa
- Salário
- Compatibilidade com o Ethos
- Local da vaga
- Proximidade com os portos da pessoa
- Capacitações, cursos e trilhas necessárias

O sistema apresenta uma lista das vagas mais apropriadas. A pessoa pode consultar os detalhes e percorrer as vagas, escolhendo as que correspondem às suas preferências. As escolhas ficam armazenadas no banco de dados e visíveis abaixo da lista. O processo pode ser repetido.

No painel “Meus Portos”, “Minhas vagas” é a apresentação padrão. Também há um botão para apresentar todas as vagas de todos os portos.

## Cursos

Cada curso é composto pelas seguintes informações:

- Nome do curso
- Nome da instituição educadora
- Carga horária
- Local do curso
- Compatibilidade com vagas
- Compatibilidade com o Ethos
- Proximidade com os portos da pessoa

O sistema apresenta uma lista dos cursos mais apropriados. A pessoa pode consultar os detalhes e percorrer os cursos, escolhendo os que correspondem às suas preferências. As escolhas ficam armazenadas no banco de dados e visíveis abaixo da lista. O processo pode ser repetido.

No painel “Meus Portos”, “Meus cursos” é a apresentação padrão. Também há um botão para apresentar todos os cursos próximos de todos os portos.

## Sistema de matching

1. Uma pessoa pode possuir zero ou mais portos.
2. O porto possui um CEP.
3. A empresa está localizada em um CEP.
4. Uma empresa possui um CNAE.
5. Uma vaga pertence a uma empresa.
6. Um curso é ministrado por uma empresa.
7. Uma vaga pode possuir zero ou mais requisitos de cursos.
8. Uma empresa pode desenvolver zero ou mais portos.

## Relações de dados

```text
Pessoa → Portos → Porto → CEP
Empresa → CEP
Empresa → CNAE
Vaga → Empresa
Curso → Empresa
Vaga → Requisitos de cursos
Empresa → Portos que desenvolve
```
