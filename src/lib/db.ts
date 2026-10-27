import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Uma única instância em desenvolvimento (o hot reload do Next criaria várias conexões).
const globalParaPrisma = globalThis as unknown as { db?: PrismaClient };

function criarCliente() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalParaPrisma.db ?? criarCliente();

if (process.env.NODE_ENV !== "production") globalParaPrisma.db = db;
