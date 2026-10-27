# Especificação de Matching de Vagas

## [Matching-Navegante]
Sempre que houver mudança de Ethos, portos ou de cursos por parte do Navegante, o sistema deve criar um arquivo JSON que leve em conta essas informações e armazene no banco de dados. Essas informações servirão para realizar o matching com as vagas e cursos que o Navegante terá pareamento. Caso não haja mudanças nessas informações do Navegante, não executar essa função novamente.

---

## Funcionamento do Matching
1. Obtenha o `[Matching-Navegante]` em questão.
2. Verifique os CEPs de empresas que apresentem o maior alinhamento possível com o navegante em questão.
3. Verifique os CNAEs dessas empresas e a existência de vagas.
4. As vagas com maior grau de matching devem ser apresentadas da mais importante para a menos importante.
5. Apresente as vagas para o navegante.
6. Caso existam requisitos de cursos para a vaga, apresente os mesmos junto com a vaga.

---

## Especificação da Vaga
- **Índice de compatibilidade**
- **Empresa**
- **Descrição**
- **Salário**
- **Local**
- **Competências necessárias ou requisito de cursos**
- **Observações**

---

## Interface e Exibição
- **Localização dos resultados:** Painel do Navegante, posicionado abaixo do painel de portos (painel de vagas).
- **Conteúdo exibido:** Listagem dos resultados de vagas correspondentes ao matching do usuário Navegante com as empresas ofertantes.
- **Regra de exibição:** Caso a especificação da vaga possua campos em branco, esses não precisam aparecer.