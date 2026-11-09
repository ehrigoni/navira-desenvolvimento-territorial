import catalogo from "./ceps-cnaes-planilha.json";
import { normalizarMunicipio } from "./mapa-portos";

export type RegistroCepCnae = (typeof catalogo.registros)[number];

export function filtrarCepsCnaes(registros: RegistroCepCnae[], busca: string, cidade = "") {
  const texto = normalizarMunicipio(busca);
  const digitos = busca.replace(/\D/g, "");
  const municipio = normalizarMunicipio(cidade);
  return registros.filter((registro) => {
    if (municipio && normalizarMunicipio(registro.cidade) !== municipio) return false;
    if (!texto) return true;
    return normalizarMunicipio(`${registro.cidade} ${registro.descricao} ${registro.cep} ${registro.cnae}`).includes(texto)
      || (digitos.length > 0 && (registro.cep.includes(digitos) || registro.cnae.includes(digitos)));
  });
}

export function agruparCepsCnaes(registros: RegistroCepCnae[]) {
  const grupos = new Map<string, { cidade: string; cep: string; atividades: RegistroCepCnae[] }>();
  for (const registro of registros) {
    const chave = `${normalizarMunicipio(registro.cidade)}:${registro.cep}`;
    const grupo = grupos.get(chave);
    if (grupo) grupo.atividades.push(registro);
    else grupos.set(chave, { cidade: registro.cidade, cep: registro.cep, atividades: [registro] });
  }
  return [...grupos.values()].sort((a, b) => a.cidade.localeCompare(b.cidade, "pt-BR") || a.cep.localeCompare(b.cep));
}

export function formatarCep(cep: string) {
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

export function formatarCnae(cnae: string) {
  return `${cnae.slice(0, 4)}-${cnae.slice(4, 5)}/${cnae.slice(5)}`;
}
