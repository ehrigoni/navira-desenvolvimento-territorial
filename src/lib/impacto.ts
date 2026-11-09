type Territorio = { cidade: string | null; uf: string | null } | null;
type VagaTerritorio = { destino: Territorio; porto: Territorio };

export function municipioComMaisVagas(vagas: VagaTerritorio[]) {
  const municipios = new Map<string, { cidade: string; uf: string; vagasAtivas: number }>();
  for (const vaga of vagas) {
    const territorio = vaga.destino?.cidade?.trim() && vaga.destino.uf?.trim() ? vaga.destino : vaga.porto;
    const cidade = territorio?.cidade?.trim();
    const uf = territorio?.uf?.trim();
    if (!cidade || !uf) continue;
    const chave = `${cidade.toLocaleLowerCase("pt-BR")}-${uf.toLocaleLowerCase("pt-BR")}`;
    const municipio = municipios.get(chave);
    if (municipio) municipio.vagasAtivas += 1;
    else municipios.set(chave, { cidade, uf, vagasAtivas: 1 });
  }
  return [...municipios.values()].sort(
    (a, b) => b.vagasAtivas - a.vagasAtivas || a.cidade.localeCompare(b.cidade, "pt-BR"),
  )[0] ?? null;
}
