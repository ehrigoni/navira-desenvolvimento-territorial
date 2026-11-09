import assert from "node:assert/strict";
import { test } from "node:test";
import catalogo from "./ceps-cnaes-planilha.json";
import municipios from "./mapa-municipios-rs.json";
import { agruparCepsCnaes, filtrarCepsCnaes, formatarCep, formatarCnae } from "./ceps-cnaes";
import { normalizarMunicipio } from "./mapa-portos";

test("catálogo preserva as associações completas da planilha e a cobertura municipal", () => {
  assert.equal(catalogo.totalLinhas, 203);
  assert.equal(catalogo.semCepValido, 1);
  assert.equal(catalogo.semCnaeValido, 27);
  assert.equal(catalogo.registros.reduce((total, registro) => total + registro.quantidade, 0), 175);
  assert.equal(agruparCepsCnaes(catalogo.registros).length, 135);
  const cidades = new Set(municipios.map((municipio) => normalizarMunicipio(municipio.nome)));
  for (const registro of catalogo.registros) {
    assert.match(registro.cep, /^\d{8}$/);
    assert.match(registro.cnae, /^\d{7}$/);
    assert.ok(registro.descricao && cidades.has(normalizarMunicipio(registro.cidade)));
  }
});

test("busca CEP e CNAE com máscara, atividade sem acento e município selecionado", () => {
  const porCep = filtrarCepsCnaes(catalogo.registros, "94810-090");
  assert.equal(porCep.length, 1);
  assert.equal(porCep[0].cnae, "9602502");
  assert.ok(filtrarCepsCnaes(catalogo.registros, "9602-5/02").length > 0);
  assert.ok(filtrarCepsCnaes(catalogo.registros, "estetica", "ALVORADA").length > 0);
  assert.equal(filtrarCepsCnaes(catalogo.registros, "94810-090", "Canoas").length, 0);
  assert.equal(formatarCep("94810090"), "94810-090");
  assert.equal(formatarCnae("9602502"), "9602-5/02");
});

test("agrupa diferentes CNAEs no mesmo CEP sem misturar municípios", () => {
  const entrada = [
    { cidade: "Canoas", cep: "92000000", cnae: "1234567", descricao: "Atividade A", quantidade: 2 },
    { cidade: "CANOAS", cep: "92000000", cnae: "7654321", descricao: "Atividade B", quantidade: 1 },
    { cidade: "Outra cidade", cep: "92000000", cnae: "1234567", descricao: "Atividade A", quantidade: 1 },
  ];
  const grupos = agruparCepsCnaes(entrada);
  assert.equal(grupos.length, 2);
  assert.equal(grupos[0].atividades.length, 2);
});
