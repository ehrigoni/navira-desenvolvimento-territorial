# Preços e cotas (fonte: precos-e-cotas.docx)

Há dois tipos de empresa: **Destino** e **Apoiador (mantenedora)**.

- **Cota de vaga:** R$ 1.300,00 por vaga lotada, para ambos. Em princípio a capacitação da pessoa fica a cargo da NAVIRA; cada caso é discutido com a empresa contratante.
- **Acompanhamento do território (somente mantenedora):** +R$ 1.300,00 por vaga lotada, para acompanhar o desenvolvimento do território onde a pessoa é lotada. Inclui:
  - uso dos números e informações em relatórios e campanhas de publicidade na internet;
  - artefatos físicos do local (livros, fotografias etc.) para campanhas de ESG.
- Dados de impacto do **Destino**: apenas uso interno.

Implementação: `src/lib/cotas.ts` (cálculo) e modelos `Pedido` / `CotaVaga` no schema.
