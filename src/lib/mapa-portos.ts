import municipios from "./mapa-municipios-rs.json";
import type { TipoPorto } from "@prisma/client";

export const ROTULOS_TIPO_PORTO: Record<TipoPorto, string> = {
  EMPRESA: "Empresa",
  IGREJA: "Igreja",
  ESCOLA: "Escola",
  ASSOCIACAO: "Associação",
  INICIATIVA: "Iniciativa",
  OUTRO: "Outro",
  ESCOLA_PUBLICA: "Escola pública",
  ESCOLA_PRIVADA: "Escola privada",
  ONG: "ONG",
  COLETIVO: "Coletivo",
};

export const CORES_TIPO_PORTO: Record<TipoPorto | "SEM_TIPO", string> = {
  EMPRESA: "#a65a06",
  IGREJA: "#6336a0",
  ESCOLA: "#1467a0",
  ASSOCIACAO: "#b12b4e",
  INICIATIVA: "#006e5b",
  OUTRO: "#515b68",
  ESCOLA_PUBLICA: "#278cbb",
  ESCOLA_PRIVADA: "#29509a",
  ONG: "#a73583",
  COLETIVO: "#7a6823",
  SEM_TIPO: "#263f48",
};

export type PortoMapa = {
  id: string;
  nome: string;
  tipo: TipoPorto | null;
  cidade: string | null;
  uf: string | null;
  status: string;
  aprovacaoPendente: boolean;
};

export function rotuloTipoPorto(tipo: TipoPorto | null) {
  return tipo ? ROTULOS_TIPO_PORTO[tipo] : "Sem tipo";
}

export function corTipoPorto(tipo: TipoPorto | null) {
  return CORES_TIPO_PORTO[tipo ?? "SEM_TIPO"];
}

export type TipoFiltroPorto = TipoPorto | "SEM_TIPO";

export function filtrarPortosPorTipo<T extends PortoMapa>(portos: T[], tipos: ReadonlySet<TipoFiltroPorto>): T[] {
  return portos.filter((porto) => tipos.has(porto.tipo ?? "SEM_TIPO"));
}

export function normalizarMunicipio(valor: string) {
  return valor.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

export function agruparPortosNoMapa<T extends PortoMapa>(portos: T[]) {
  const porMunicipio = new Map(municipios.map((municipio) => [normalizarMunicipio(municipio.nome), [] as T[]]));
  const foraDoMapa: T[] = [];
  const semLocalidade: T[] = [];
  for (const porto of portos) {
    if (!porto.cidade?.trim() || !porto.uf?.trim()) {
      semLocalidade.push(porto);
      continue;
    }

    const grupo = porto.uf.trim().toUpperCase() === "RS" ? porMunicipio.get(normalizarMunicipio(porto.cidade)) : undefined;
    if (grupo) grupo.push(porto);
    else foraDoMapa.push(porto);
  }
  return { porMunicipio, foraDoMapa, semLocalidade };
}

type Ponto = { x: number; y: number };
type MarcadorPorto<T extends PortoMapa> = Ponto & { porto: T };

function pontosNoMunicipio(caminho: string, quantidade: number): Ponto[] {
  const aneis = caminho.split(" Z").map((anel) =>
    [...anel.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((p) => ({ x: Number(p[1]), y: Number(p[2]) })),
  ).filter((anel) => anel.length >= 3);
  const pontos = aneis.flat();
  if (!pontos.length || !quantidade) return [];
  const minX = Math.min(...pontos.map((p) => p.x));
  const maxX = Math.max(...pontos.map((p) => p.x));
  const minY = Math.min(...pontos.map((p) => p.y));
  const maxY = Math.max(...pontos.map((p) => p.y));

  function dentro(x: number, y: number) {
    let resultado = false;
    for (const anel of aneis) {
      for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
        const a = anel[i], b = anel[j];
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) resultado = !resultado;
      }
    }
    return resultado;
  }

  for (const passo of [10, 6, 3, 1.5]) {
    const candidatos: Ponto[] = [];
    for (let y = Math.ceil(minY / passo) * passo; y <= maxY; y += passo) {
      for (let x = Math.ceil(minX / passo) * passo; x <= maxX; x += passo) {
        if (dentro(x, y)) candidatos.push({ x, y });
      }
    }
    if (candidatos.length >= quantidade) {
      return Array.from({ length: quantidade }, (_, i) => candidatos[Math.floor(i * candidatos.length / quantidade)]);
    }
  }
  return [];
}

export function marcadoresEsquematicos<T extends PortoMapa>(portos: T[]): { marcadores: MarcadorPorto<T>[]; semEspaco: T[] } {
  const { porMunicipio } = agruparPortosNoMapa(portos);
  const marcadores: MarcadorPorto<T>[] = [];
  const semEspaco: T[] = [];
  for (const municipio of municipios) {
    const grupo = [...(porMunicipio.get(normalizarMunicipio(municipio.nome)) ?? [])].sort((a, b) => a.id.localeCompare(b.id));
    const pontos = pontosNoMunicipio(municipio.caminho, grupo.length);
    if (pontos.length !== grupo.length) {
      semEspaco.push(...grupo);
      continue;
    }
    grupo.forEach((porto, indice) => marcadores.push({ porto, ...pontos[indice] }));
  }
  return { marcadores, semEspaco };
}
