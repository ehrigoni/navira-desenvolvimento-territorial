// Dados de exemplo para desenvolvimento. Não rode em produção.
// Logins criados: navegante (11) 91234-5678 e porto (11) 98765-4321 / porto@exemplo.com.br, senha SENHA_DEMO.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { EthosStatus, PrismaClient } from "@prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const SENHA_DEMO = "navira2026";

async function main() {
  const senhaHash = await bcrypt.hash(SENHA_DEMO, 12);

  const usuarioNavegante = await db.usuario.upsert({
    where: { telefone: "11912345678" },
    update: {},
    create: {
      nome: "Maria Demonstração",
      telefone: "11912345678",
      senhaHash,
      papel: "NAVEGANTE",
      navegante: { create: { ethosStatus: EthosStatus.CONCLUIDO, ethosConcluidoEm: new Date() } },
    },
    include: { navegante: true },
  });

  const usuarioPorto = await db.usuario.upsert({
    where: { telefone: "11987654321" },
    update: {},
    create: {
      nome: "Responsável Demonstração",
      telefone: "11987654321",
      email: "porto@exemplo.com.br",
      senhaHash,
      papel: "PORTO",
      porto: {
        create: { nome: "Associação Vila Demo", tipo: "ASSOCIACAO", cep: "90040060", cidade: "Porto Alegre", uf: "RS" },
      },
    },
  });

  const porto = await db.porto.findUniqueOrThrow({ where: { usuarioId: usuarioPorto.id } });
  let portoIgreja = await db.porto.findFirst({ where: { nome: "Igreja Comunitária Demo" } });
  portoIgreja ??= await db.porto.create({
    data: { nome: "Igreja Comunitária Demo", tipo: "IGREJA", cep: "90010100", cidade: "Porto Alegre", uf: "RS" },
  });

  await db.inscricaoPorto.upsert({
    where: { naveganteId_portoId: { naveganteId: usuarioNavegante.navegante!.id, portoId: portoIgreja.id } },
    update: {},
    create: { naveganteId: usuarioNavegante.navegante!.id, portoId: portoIgreja.id },
  });

  // Empresa (Destino) exige um usuário próprio (papel DESTINO) no schema de produção.
  const usuarioEmpresa = await db.usuario.upsert({
    where: { telefone: "1133334444" },
    update: {},
    create: {
      nome: "Empresa Demonstração Ltda.",
      telefone: "1133334444",
      senhaHash,
      papel: "DESTINO",
    },
  });

  const empresa = await db.destino.upsert({
    where: { usuarioId: usuarioEmpresa.id },
    update: {},
    create: {
      usuarioId: usuarioEmpresa.id,
      razaoSocial: "Empresa Demonstração Ltda.",
      cnpj: "12345678000190",
      cnae: "4711-3/02",
      cep: "90030000",
      cidade: "Porto Alegre",
      uf: "RS",
    },
  });

  await db.empresaPorto.upsert({
    where: { destinoId_portoId: { destinoId: empresa.id, portoId: porto.id } },
    update: {},
    create: { destinoId: empresa.id, portoId: porto.id },
  });

  const curso = await db.curso.upsert({
    where: { id: "curso-atendimento-demo" },
    update: {},
    create: {
      id: "curso-atendimento-demo",
      nome: "Atendimento ao cliente",
      descricao: "Noções de atendimento e comunicação.",
      cargaHorariaHoras: 40,
      modalidade: "REMOTA",
      instituicaoEnsino: "Trilha Demonstração",
    },
  });

  const jaTemVaga = await db.vaga.count({ where: { destinoId: empresa.id } });
  if (jaTemVaga === 0) {
    await db.vaga.create({
      data: {
        destinoId: empresa.id,
        titulo: "Auxiliar de atendimento",
        descricao: "Atendimento presencial no comércio local.",
        salarioMinCentavos: 210000,
        cep: "90030000",
        cursos: { create: [{ cursoId: curso.id }] },
      },
    });
    await db.vaga.create({
      data: {
        destinoId: empresa.id,
        titulo: "Repositor de estoque",
        descricao: "Reposição de mercadorias em loja.",
        salarioMinCentavos: 190000,
        cep: "90030000",
      },
    });
  }

  console.info(`Seed concluído. Senha de demonstração: ${SENHA_DEMO}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
