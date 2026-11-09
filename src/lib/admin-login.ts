import { db } from "./db";
import bcrypt from "bcryptjs";

export async function registrarFalhaLoginAdmin(id: string) {
  await db.$executeRaw`
    UPDATE "Administrador"
    SET "tentativasFalhas" = "tentativasFalhas" + 1,
        "bloqueadoAte" = CASE WHEN "tentativasFalhas" + 1 >= 5 THEN (NOW() AT TIME ZONE 'UTC') + INTERVAL '15 minutes' ELSE NULL END
    WHERE id = ${id} AND ativo = true AND ("bloqueadoAte" IS NULL OR "bloqueadoAte" <= (NOW() AT TIME ZONE 'UTC'))
  `;
}

let hashFalso: string | undefined;

export async function autenticarAdministrador(login: string, senha: string) {
  const admin = await db.administrador.findUnique({ where: { login } });
  hashFalso ??= bcrypt.hashSync("navira-dummy-admin", 12);
  const confere = Buffer.byteLength(senha, "utf8") <= 72 && await bcrypt.compare(senha, admin?.senhaHash ?? hashFalso);
  if (!admin?.ativo || admin.aprovacaoPendente || (admin.bloqueadoAte && admin.bloqueadoAte > new Date())) return null;
  if (!confere) {
    await registrarFalhaLoginAdmin(admin.id);
    return null;
  }
  const atualizado = await db.administrador.updateMany({
    where: { id: admin.id, ativo: true, aprovacaoPendente: false, senhaHash: admin.senhaHash, OR: [{ bloqueadoAte: null }, { bloqueadoAte: { lte: new Date() } }] },
    data: { tentativasFalhas: 0, bloqueadoAte: null, ultimoLoginEm: new Date() },
  });
  return atualizado.count ? { id: admin.id, nome: admin.nome, trocarSenha: admin.trocarSenha } : null;
}
