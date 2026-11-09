import catalogo from "./cnae-2.3.json";

const descricoes: Readonly<Record<string, string>> = catalogo;

export function descricaoCnae(valor: string): string | null {
  if (!/^[\d./-]+$/.test(valor)) return null;
  const codigo = valor.replace(/\D/g, "");
  if (!/^\d{7}$/.test(codigo)) return null;
  return descricoes[codigo] ?? null;
}
