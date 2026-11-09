export function mascararData(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join("/");
}

export function dataCalendario(valor: string): Date | null | false {
  if (!valor) return null;
  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  const iso = brasileira ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}` : valor;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const data = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso ? false : data;
}
