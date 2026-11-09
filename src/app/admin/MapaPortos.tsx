"use client";

import { useMemo, useState } from "react";
import municipios from "@/lib/mapa-municipios-rs.json";
import catalogoCeps from "@/lib/ceps-cnaes-planilha.json";
import { agruparPortosNoMapa, corTipoPorto, filtrarPortosPorTipo, marcadoresEsquematicos, normalizarMunicipio, rotuloTipoPorto, type TipoFiltroPorto } from "@/lib/mapa-portos";
import { agruparCepsCnaes, filtrarCepsCnaes, formatarCep, formatarCnae } from "@/lib/ceps-cnaes";
import LinhaPortoAdmin, { type PortoAdmin } from "./LinhaPortoAdmin";

function ListaPortos({ portos }: { portos: PortoAdmin[] }) {
  if (!portos.length) return <p>Nenhum Porto nesta categoria.</p>;
  return <ul className="admin-lista">{portos.map((porto) => <LinhaPortoAdmin key={porto.id} porto={porto} mapa />)}</ul>;
}

export default function MapaPortos({ portos }: { portos: PortoAdmin[] }) {
  const [selecionado, setSelecionado] = useState("");
  const [camada, setCamada] = useState<"portos" | "cnaes">("portos");
  const [tiposExcluidos, setTiposExcluidos] = useState<Set<TipoFiltroPorto>>(() => new Set());
  const [busca, setBusca] = useState("");
  const tiposPresentes = [...new Set(portos.map((porto) => porto.tipo))].sort((a, b) => rotuloTipoPorto(a).localeCompare(rotuloTipoPorto(b), "pt-BR"));
  const tiposSelecionados = new Set(tiposPresentes.map((tipo) => tipo ?? "SEM_TIPO").filter((tipo) => !tiposExcluidos.has(tipo)));
  const todosSelecionados = tiposPresentes.every((tipo) => !tiposExcluidos.has(tipo ?? "SEM_TIPO"));
  const { marcadores, semEspaco } = useMemo(() => marcadoresEsquematicos(portos), [portos]);
  const portosFiltrados = filtrarPortosPorTipo(portos, tiposSelecionados);
  const idsFiltrados = new Set(portosFiltrados.map((porto) => porto.id));
  const marcadoresFiltrados = marcadores.filter(({ porto }) => idsFiltrados.has(porto.id));
  const semEspacoFiltrados = semEspaco.filter((porto) => idsFiltrados.has(porto.id));
  const { porMunicipio, foraDoMapa, semLocalidade } = agruparPortosNoMapa(portosFiltrados);
  const municipiosComPortos = municipios.filter((m) => (porMunicipio.get(normalizarMunicipio(m.nome))?.length ?? 0) > 0);
  const portosSelecionados = porMunicipio.get(normalizarMunicipio(selecionado)) ?? [];
  const registrosFiltrados = filtrarCepsCnaes(catalogoCeps.registros, busca);
  const cepsFiltrados = agruparCepsCnaes(filtrarCepsCnaes(registrosFiltrados, "", selecionado));
  const totalRegistros = catalogoCeps.registros.reduce((total, registro) => total + registro.quantidade, 0);

  return <section className="cartao mapa-portos">
    <h2>Mapa de atuação dos Portos</h2>
    <p>Explore os Portos cadastrados e os CEPs associados a CNAEs na planilha de empresas.</p>
    {camada === "portos" && <p className="ajuda"><strong>Marcadores esquemáticos:</strong> cada ponto representa um Porto, distribuído artificialmente dentro do município cadastrado. A posição não corresponde ao endereço, CEP ou área real de atuação.</p>}
    <p className="ajuda">Cobertura cartográfica: 14 municípios de Porto Alegre e região metropolitana. Limites municipais: malhas IBGE, conforme o arquivo fornecido.</p>
    <div className="campo">
      <label htmlFor="camada-mapa">Exibir no mapa</label>
      <select id="camada-mapa" value={camada} onChange={(evento) => setCamada(evento.target.value === "cnaes" ? "cnaes" : "portos")}>
        <option value="portos">Portos cadastrados</option>
        <option value="cnaes">CEPs com CNAE</option>
      </select>
    </div>
    {camada === "portos" && <div className="mapa-tipos" role="group" aria-label="Filtrar Portos por tipo de entidade">
      <button type="button" className="botao" aria-pressed={todosSelecionados} onClick={() => setTiposExcluidos(new Set())}>Todos ({portos.length})</button>
      {tiposPresentes.map((item) => {
        const valor = item ?? "SEM_TIPO";
        const quantidade = portos.filter((porto) => porto.tipo === item).length;
        return <button key={valor} type="button" className="botao" aria-pressed={!tiposExcluidos.has(valor)} onClick={() => setTiposExcluidos((anteriores) => {
          const proximos = new Set(anteriores);
          if (proximos.has(valor)) proximos.delete(valor);
          else proximos.add(valor);
          return proximos;
        })}><span className="mapa-tipo-cor" style={{ backgroundColor: corTipoPorto(item) }} aria-hidden="true" />{rotuloTipoPorto(item)} ({quantidade})</button>;
      })}
    </div>}
    {camada === "cnaes" && <div className="campo">
      <label htmlFor="busca-cnae-mapa">Buscar CEP, CNAE, atividade ou município</label>
      <input id="busca-cnae-mapa" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Ex.: 92020-240 ou comércio" />
    </div>}
    <div className="mapa-portos-legenda"><span><i className={camada === "cnaes" ? "mapa-legenda-cnae" : "mapa-legenda-com"} /> {camada === "cnaes" ? "Com CEPs e CNAEs encontrados" : "Município com Portos cadastrados"}</span><span><i className="mapa-legenda-sem" /> Sem registros nesta camada</span></div>
    <svg viewBox="0 0 1000 800" role="img" aria-label={`Mapa dos 14 municípios da região metropolitana de Porto Alegre, ${camada === "cnaes" ? "destacando CEPs com CNAE por município" : "com marcadores esquemáticos por tipo, sem localização exata"}`} className="mapa-portos-svg">
      {municipios.map((municipio) => {
        const quantidade = camada === "portos"
          ? porMunicipio.get(normalizarMunicipio(municipio.nome))?.length ?? 0
          : agruparCepsCnaes(filtrarCepsCnaes(registrosFiltrados, "", municipio.nome)).length;
        const classe = quantidade ? (camada === "portos" ? " com-portos" : " com-cnaes") : "";
        return <path key={municipio.ibge} d={municipio.caminho} fillRule="evenodd" className={`mapa-municipio${classe}`}><title>{municipio.nome}: {quantidade} {camada === "portos" ? "Porto(s)" : "CEP(s) com CNAE"}</title></path>;
      })}
      {camada === "portos" && marcadoresFiltrados.map(({ porto, x, y }) => <circle key={porto.id} cx={x} cy={y} r="3" fill={corTipoPorto(porto.tipo)} className="marcador-porto"><title>{porto.nome} · {rotuloTipoPorto(porto.tipo)} · {porto.cidade}/{porto.uf} · posição esquemática</title></circle>)}
    </svg>
    <div className="campo">
      <label htmlFor="municipio-mapa">Consultar município</label>
      <select id="municipio-mapa" value={selecionado} onChange={(evento) => setSelecionado(evento.target.value)}>
        <option value="">Selecione um município</option>
        {municipios.map((municipio) => <option key={municipio.ibge} value={municipio.nome}>{municipio.nome}</option>)}
      </select>
    </div>
    {camada === "portos" ? <>
      {portosFiltrados.length === 0 && <p role="status">Nenhum Porto para os tipos selecionados. Selecione um tipo ou clique em Todos.</p>}
      {selecionado && <div><h3>{selecionado}: {portosSelecionados.length} Porto(s)</h3><ListaPortos portos={portosSelecionados} /></div>}
      <p><strong>{municipiosComPortos.length}</strong> dos {municipios.length} municípios do mapa têm Portos cadastrados, inclusive pendentes ou inativos.</p>
      <p className="ajuda">{marcadoresFiltrados.length} Porto(s) representados por marcadores esquemáticos. Para identificar cada Porto, selecione seu município na lista acima.</p>
      {semEspacoFiltrados.length > 0 && <details><summary>Portos não representados por falta de espaço no município ({semEspacoFiltrados.length})</summary><ListaPortos portos={semEspacoFiltrados} /></details>}
      <details><summary>Portos fora da cobertura do mapa ({foraDoMapa.length})</summary><ListaPortos portos={foraDoMapa} /></details>
      <details><summary>Portos sem município ou UF ({semLocalidade.length})</summary><ListaPortos portos={semLocalidade} /></details>
    </> : <>
      <p className="ajuda">Fonte: planilha fornecida de empresas e CNAEs, não o cadastro de Portos. Os CNAEs são os associados na planilha e não constituem validação cadastral. Não há coordenadas de CEP no arquivo; a cor identifica apenas o município informado.</p>
      <p className="ajuda">{totalRegistros} de {catalogoCeps.totalLinhas} registros possuem CEP e CNAE em formato completo para esta visualização. A planilha contém {catalogoCeps.semCepValido} registro(s) sem CEP completo e {catalogoCeps.semCnaeValido} sem CNAE identificado; essas contagens podem se sobrepor.</p>
      <div aria-live="polite">
        <h3>{selecionado || "Todos os municípios"}: {cepsFiltrados.length} CEP(s) com CNAE</h3>
        {cepsFiltrados.length === 0 ? <p>Nenhum CEP encontrado para os filtros informados.</p> : <div className="mapa-ceps-lista">
          {cepsFiltrados.map((grupo) => <details key={`${grupo.cidade}-${grupo.cep}`}>
            <summary>{formatarCep(grupo.cep)} · {grupo.cidade} · {grupo.atividades.length} CNAE(s)</summary>
            <ul className="lista">{grupo.atividades.map((atividade) => <li key={`${atividade.cnae}-${atividade.descricao}`}><strong>{formatarCnae(atividade.cnae)}</strong> · {atividade.descricao} · {atividade.quantidade} registro(s)</li>)}</ul>
          </details>)}
        </div>}
      </div>
    </>}
  </section>;
}
