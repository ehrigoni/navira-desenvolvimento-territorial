import { apenasDigitos } from "./validacao";

export function cnpjValido(cnpj: string): boolean {
  const numeros = apenasDigitos(cnpj);
  if (!/^\d{14}$/.test(numeros) || /^(\d)\1{13}$/.test(numeros)) return false;
  const digito = (base: string, pesos: number[]) => {
    const resto = [...base].reduce((soma, numero, indice) => soma + Number(numero) * pesos[indice], 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = digito(numeros.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digito(numeros.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return Number(numeros[12]) === primeiro && Number(numeros[13]) === segundo;
}

export function dataCalendario(valor: string): Date | null | false {
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor ? false : data;
}

export function detalhesVaga(requisitos: unknown) {
  if (!requisitos || typeof requisitos !== "object" || Array.isArray(requisitos)) return { requisitos: "", expectativas: "" };
  const dados = requisitos as Record<string, unknown>;
  return {
    requisitos: typeof dados.requisitos === "string" ? dados.requisitos : "",
    expectativas: typeof dados.expectativas === "string" ? dados.expectativas : "",
  };
}
