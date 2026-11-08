// Importa as entidades de Porto Alegre e região (escolas, igrejas e associações) como portos.
// Fonte: prisma/data/entidades-porto-alegre.json (gerado de docs/navegante/entidadesOrganizadas.xlsx).
// Idempotente: a chave é Porto.codigo. Rodar de novo atualiza os dados sem duplicar.
// CEPs divergentes na conferência chegam com cep = null e status EM_ANALISE.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, StatusPorto, TipoPorto } from "@prisma/client";

type EntidadeImportada = {
  codigo: string;
  nome: string;
  tipo: TipoPorto;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string;
  uf: string;
  cep: string | null;
};

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const caminho = join(__dirname, "data", "entidades-porto-alegre.json");
  const entidades: EntidadeImportada[] = JSON.parse(readFileSync(caminho, "utf8"));

  let criados = 0;
  let atualizados = 0;
  for (const entidade of entidades) {
    const dados = {
      nome: entidade.nome,
      tipo: entidade.tipo,
      logradouro: entidade.logradouro,
      numero: entidade.numero,
      bairro: entidade.bairro,
      cidade: entidade.cidade,
      uf: entidade.uf,
      cep: entidade.cep,
      // Sem CEP confirmado: a entidade fica em análise até alguém validar o endereço.
      status: entidade.cep ? StatusPorto.ATIVO : StatusPorto.EM_ANALISE,
    };
    // Casa primeiro pelo código; senão pelo nome e cidade (bancos que já têm as entidades com outro código).
    const existente = await db.porto.findFirst({
      where: {
        OR: [
          { codigo: entidade.codigo },
          { nome: { equals: entidade.nome, mode: "insensitive" }, cidade: entidade.cidade },
        ],
      },
      select: { id: true },
    });
    if (existente) {
      await db.porto.update({ where: { id: existente.id }, data: dados });
      atualizados++;
    } else {
      await db.porto.create({ data: { codigo: entidade.codigo, ...dados } });
      criados++;
    }
  }

  console.info(`Entidades importadas: ${entidades.length} (criadas: ${criados}, atualizadas: ${atualizados}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
