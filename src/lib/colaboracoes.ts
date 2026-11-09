import { Prisma } from "@prisma/client";

export function quantidadeColaboracao(valor: FormDataEntryValue | null): Prisma.Decimal | null {
  if (typeof valor !== "string" || !/^\d{1,10}([.,]\d{1,2})?$/.test(valor.trim())) return null;
  const numero = new Prisma.Decimal(valor.trim().replace(",", "."));
  return numero.greaterThan(0) ? numero : null;
}

export function formatarQuantidade(valor: Prisma.Decimal | number | string): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(valor));
}
