import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const registro = z.object({
  codigo: z.string().regex(/^empresa-osm-[a-f0-9]{64}$/),
  nome: z.string().min(1),
  cidade: z.string().min(1),
  uf: z.literal("RS"),
  cep: z.string().regex(/^\d{8}$/).nullable(),
  cnae: z.string().regex(/^\d{7}$/).nullable(),
  bairro: z.string().nullable(),
  logradouro: z.string().nullable(),
  fonte: z.string().url(),
});

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const url = new URL(process.env.DATABASE_URL ?? "");
  const empresas = z.array(registro).parse(JSON.parse(readFileSync(join(__dirname, "data", "empresas-cnaes.json"), "utf8")));
  if (new Set(empresas.map((empresa) => empresa.codigo)).size !== empresas.length) throw new Error("Fontes duplicadas na planilha.");
  console.info(`Banco: ${url.hostname}/${url.pathname.slice(1)}. Modo: ${aplicar ? "importação" : "simulação"}.`);
  const resultado = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(718034220)::text`;
    const existentes = await tx.porto.findMany({ select: { codigo: true, nome: true, cidade: true } });
    const codigos = new Set(existentes.map((item) => item.codigo).filter((codigo): codigo is string => codigo !== null));
    const chave = (nome: string, cidade: string) => `${nome.trim().toLocaleLowerCase("pt-BR")}\0${cidade.trim().toLocaleLowerCase("pt-BR")}`;
    const nomes = new Set(existentes.filter((item) => item.cidade).map((item) => chave(item.nome, item.cidade!)));
    let jaImportados = 0;
    const possiveisDuplicados: string[] = [];
    const novos = [];
    for (const empresa of empresas) {
      if (codigos.has(empresa.codigo)) { jaImportados++; continue; }
      if (nomes.has(chave(empresa.nome, empresa.cidade))) {
        possiveisDuplicados.push(`${empresa.nome} / ${empresa.cidade}`);
        continue;
      }
      nomes.add(chave(empresa.nome, empresa.cidade));
      novos.push({
        codigo: empresa.codigo, nome: empresa.nome, cidade: empresa.cidade, uf: empresa.uf,
        cep: empresa.cep, cnae: empresa.cnae, bairro: empresa.bairro, logradouro: empresa.logradouro,
        tipo: "EMPRESA" as const, status: "ATIVO" as const, aprovacaoPendente: false,
      });
    }
    if (aplicar && novos.length) await tx.porto.createMany({ data: novos });
    return { jaImportados, possiveisDuplicados, novos: novos.length };
  });
  console.info(`Planilha: ${empresas.length}; ${aplicar ? "criados" : "a criar"}: ${resultado.novos}; já importados: ${resultado.jaImportados}; possíveis duplicados ignorados: ${resultado.possiveisDuplicados.length}.`);
  for (const duplicado of resultado.possiveisDuplicados) console.info(`Possível duplicado: ${duplicado}`);
  if (!aplicar) console.info("Nenhuma alteração foi feita. Use --aplicar após conferir o destino.");
}

main().catch((erro) => {
  console.error("[importar-empresas] Falha na importação:", erro);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
