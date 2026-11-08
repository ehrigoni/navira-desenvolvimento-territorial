import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcularIndiceLocal, formatarFaixaSalarial } from "./matching";
import { assinarPerfil, montarPerfilMatching } from "./matching-navegante";

const porto = { cep: "90010100", cidade: "Porto Alegre", uf: "RS" };

describe("calcularIndiceLocal", () => {
  it("100 para o mesmo CEP", () => {
    assert.equal(calcularIndiceLocal({ cep: "90010-100", cidade: "Porto Alegre", uf: "RS" }, [porto]), 100);
  });

  it("75 para o mesmo CEP de 5 dígitos", () => {
    assert.equal(calcularIndiceLocal({ cep: "90010999", cidade: "Porto Alegre", uf: "RS" }, [porto]), 75);
  });

  it("50 para os mesmos 3 primeiros dígitos", () => {
    assert.equal(calcularIndiceLocal({ cep: "90040000", cidade: "Porto Alegre", uf: "RS" }, [porto]), 50);
  });

  it("40 para mesma cidade sem CEP comparável, ignorando acento e caixa", () => {
    assert.equal(calcularIndiceLocal({ cep: null, cidade: "PORTO ALEGRE", uf: "RS" }, [porto]), 40);
    assert.equal(calcularIndiceLocal({ cep: null, cidade: "Pórto Alegre", uf: "RS" }, [porto]), 40);
  });

  it("20 para a mesma UF em outra cidade", () => {
    assert.equal(calcularIndiceLocal({ cep: "95000000", cidade: "Caxias do Sul", uf: "RS" }, [porto]), 20);
  });

  it("0 para outra UF ou sem portos", () => {
    assert.equal(calcularIndiceLocal({ cep: "01001000", cidade: "São Paulo", uf: "SP" }, [porto]), 0);
    assert.equal(calcularIndiceLocal({ cep: "90010100", cidade: "Porto Alegre", uf: "RS" }, []), 0);
  });

  it("usa o melhor porto quando há vários", () => {
    const portos = [{ cep: "95000000", cidade: "Caxias do Sul", uf: "RS" }, porto];
    assert.equal(calcularIndiceLocal({ cep: "90010100", cidade: "Porto Alegre", uf: "RS" }, portos), 100);
  });
});

describe("formatarFaixaSalarial", () => {
  it("formata centavos em reais e faixas", () => {
    assert.equal(formatarFaixaSalarial(210000, null)?.replace(/\s/g, " "), "R$ 2.100,00");
    assert.equal(formatarFaixaSalarial(190000, 250000)?.replace(/\s/g, " "), "R$ 1.900,00 a R$ 2.500,00");
    assert.equal(formatarFaixaSalarial(null, null), null);
  });
});

describe("[Matching-Navegante]: assinatura do perfil", () => {
  const base = {
    portos: [{ id: "p2", cep: "90010100", cidade: "Porto Alegre", uf: "RS" }, { id: "p1", cep: null, cidade: null, uf: null }],
    cursosRealizados: [{ curso: "Excel", cargaHoraria: 20, modalidade: "REMOTA" }],
    ethosConcluido: true,
  };

  it("é a mesma para a mesma entrada, independente da ordem", () => {
    const outraOrdem = { ...base, portos: [...base.portos].reverse() };
    assert.equal(assinarPerfil(montarPerfilMatching(base)), assinarPerfil(montarPerfilMatching(outraOrdem)));
  });

  it("muda quando um porto, um curso ou o Ethos muda", () => {
    const original = assinarPerfil(montarPerfilMatching(base));
    assert.notEqual(original, assinarPerfil(montarPerfilMatching({ ...base, portos: [base.portos[0]] })));
    assert.notEqual(original, assinarPerfil(montarPerfilMatching({ ...base, cursosRealizados: [] })));
    assert.notEqual(original, assinarPerfil(montarPerfilMatching({ ...base, ethosConcluido: false })));
  });
});
