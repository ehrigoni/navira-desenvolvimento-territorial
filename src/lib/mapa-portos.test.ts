import assert from "node:assert/strict";
import { test } from "node:test";
import municipios from "./mapa-municipios-rs.json";
import { agruparPortosNoMapa, corTipoPorto, filtrarPortosPorTipo, marcadoresEsquematicos, normalizarMunicipio, type PortoMapa } from "./mapa-portos";
import { municipioComMaisVagas } from "./impacto";

test("classifica Portos por município e não confunde UF ou localidade ausente", () => {
  const base = { status: "ATIVO", aprovacaoPendente: false, tipo: "EMPRESA" as const };
  const portos: PortoMapa[] = [
    { ...base, id: "1", nome: "Um", cidade: "  SÃO   LEOPOLDO ", uf: " rs " },
    { ...base, id: "2", nome: "Dois", cidade: "São Leopoldo", uf: "SC" },
    { ...base, id: "3", nome: "Três", cidade: "Pelotas", uf: "RS" },
    { ...base, id: "4", nome: "Quatro", cidade: null, uf: "RS" },
    { ...base, id: "5", nome: "Cinco", cidade: "Canoas", uf: null },
  ];
  const grupos = agruparPortosNoMapa(portos);
  assert.deepEqual(grupos.porMunicipio.get(normalizarMunicipio("São Leopoldo"))?.map((p) => p.id), ["1"]);
  assert.deepEqual(grupos.foraDoMapa.map((p) => p.id), ["2", "3"]);
  assert.deepEqual(grupos.semLocalidade.map((p) => p.id), ["4", "5"]);
});

test("filtro inclui todos, empresas, outros tipos e entidades sem tipo", () => {
  const base = { cidade: "Canoas", uf: "RS", status: "ATIVO", aprovacaoPendente: false };
  const portos: PortoMapa[] = [
    { ...base, id: "1", nome: "Empresa", tipo: "EMPRESA" },
    { ...base, id: "2", nome: "Igreja", tipo: "IGREJA" },
    { ...base, id: "3", nome: "Sem tipo", tipo: null },
  ];
  assert.equal(filtrarPortosPorTipo(portos, new Set(["EMPRESA", "IGREJA", "SEM_TIPO"])).length, 3);
  assert.deepEqual(filtrarPortosPorTipo(portos, new Set(["EMPRESA"])).map((p) => p.id), ["1"]);
  assert.deepEqual(filtrarPortosPorTipo(portos, new Set(["EMPRESA", "IGREJA"])).map((p) => p.id), ["1", "2"]);
  assert.deepEqual(filtrarPortosPorTipo(portos, new Set(["SEM_TIPO"])).map((p) => p.id), ["3"]);
  assert.deepEqual(filtrarPortosPorTipo(portos, new Set()), []);
});

test("representa cada Porto coberto uma vez em posições esquemáticas estáveis", () => {
  const base = { cidade: "Porto Alegre", uf: "RS", status: "ATIVO", aprovacaoPendente: false, tipo: "EMPRESA" as const };
  const portos: PortoMapa[] = Array.from({ length: 203 }, (_, i) => ({ ...base, id: `empresa-${i}`, nome: `Empresa ${i}` }));
  portos.push({ ...base, id: "igreja", nome: "Igreja", tipo: "IGREJA" });
  portos.push({ ...base, id: "fora", nome: "Fora", cidade: "Pelotas" });
  const resultado = marcadoresEsquematicos(portos);
  assert.equal(resultado.marcadores.length, 204);
  assert.equal(resultado.semEspaco.length, 0);
  assert.equal(new Set(resultado.marcadores.map((p) => `${p.x},${p.y}`)).size, 204);
  assert.ok(resultado.marcadores.every((p) => p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 800));
  assert.deepEqual(resultado, marcadoresEsquematicos([...portos].reverse()));
  assert.notEqual(corTipoPorto("EMPRESA"), corTipoPorto("IGREJA"));
});

test("mapa possui os 14 municípios e caminhos válidos dentro do quadro", () => {
  assert.equal(municipios.length, 14);
  assert.equal(new Set(municipios.map((m) => m.ibge)).size, 14);
  for (const municipio of municipios) {
    assert.match(municipio.caminho, /^M.* Z$/);
    const pontos = [...municipio.caminho.matchAll(/([0-9.]+),([0-9.]+)/g)];
    assert.ok(pontos.length > 3);
    for (const ponto of pontos) {
      assert.ok(Number(ponto[1]) >= 0 && Number(ponto[1]) <= 1000);
      assert.ok(Number(ponto[2]) >= 0 && Number(ponto[2]) <= 800);
    }
  }
});

test("município destaque usa destino completo, Porto como alternativa e ordena empates", () => {
  const vagas = [
    { destino: { cidade: "Canoas", uf: "RS" }, porto: { cidade: "Porto Alegre", uf: "RS" } },
    { destino: { cidade: "Canoas", uf: null }, porto: { cidade: "Porto Alegre", uf: "RS" } },
    { destino: null, porto: { cidade: "  canoas ", uf: "rs" } },
    { destino: null, porto: null },
  ];
  assert.deepEqual(municipioComMaisVagas(vagas), { cidade: "Canoas", uf: "RS", vagasAtivas: 2 });
  assert.equal(municipioComMaisVagas([]), null);
  assert.equal(municipioComMaisVagas(vagas.slice(0, 2))?.cidade, "Canoas");
});
