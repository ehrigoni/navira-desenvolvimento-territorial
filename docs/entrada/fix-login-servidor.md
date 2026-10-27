# Fix de login: e-mail ou telefone, validação na tela e no servidor

Login e cadastro aceitam e-mail e número de telefone celular. Os dois são checados tanto na tela de entrada (navegador) quanto no back-end (servidor).

**Sem limite de tentativas:** A pessoa pode tentar entrar na plataforma quantas vezes quiser, sem restrições. Não há bloqueio de conta, rate limiting ou limite de tentativas de nenhum tipo.

## O que o patch muda

- `src/lib/validacao.ts`: nova função `validarCredenciais(identificador, senha)`, usada pelo navegador e pelo servidor, e `validarLogin(formData)`, a versão do servidor que lê o formulário sem confiar no navegador.
- `src/app/entrar/actions.ts`: a ação de login usa `validarLogin`, trata falhas de banco com mensagem genérica e não bloqueia a entrada se o registro do último login falhar.
- Cadastro: senha entre 8 e 72 caracteres.
- **Login:** sem limite de tentativas, sem rate limiting, sem bloqueio de conta.

## Pendente ao aplicar no repositório

- Ligar `validarCredenciais` ao formulário da tela de login (o arquivo do formulário não está no patch).

## Patch

```diff
From 6324718cb6ab0f377c425054bd965e1553d58d95 Mon Sep 17 00:00:00 2001
From: Claude <noreply@anthropic.com>
Date: Mon, 5 Oct 2026 01:22:59 +0000
Subject: [PATCH] fix(login): validar e-mail ou celular e senha no cliente e no servidor
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit

Login e cadastro aceitam e-mail e número de telefone celular. Os dois são
checados tanto na tela de entrada (navegador) quanto no back-end (servidor),
com a mesma função de validação (validarCredenciais). A pessoa pode tentar
entrar na plataforma indefinidamente: não há limite de tentativas.

Detalhes:
- e-mail validado e normalizado em minúsculas (até 254 caracteres)
- celular com DDD, normalizado só com dígitos
- tipo do valor checado no servidor (arquivos ou entradas inesperadas contam como vazio)
- senha de login limitada a 128 caracteres; no cadastro, 72 (limite do bcrypt)
- falha de banco devolve mensagem genérica em vez de derrubar a tela
- falha ao registrar último login não bloqueia a entrada

---
 src/app/entrar/actions.ts | 51 +++++++++++++++++++++------------------
 src/lib/validacao.ts      | 49 +++++++++++++++++++++++++++++++++-
 2 files changed, 76 insertions(+), 24 deletions(-)

diff --git a/src/app/entrar/actions.ts b/src/app/entrar/actions.ts
index ca4216a..bd42c08 100644
--- a/src/app/entrar/actions.ts
+++ b/src/app/entrar/actions.ts
@@ -5,12 +5,12 @@ import { redirect } from "next/navigation";
 import { db } from "@/lib/db";
 import { criarSessao } from "@/lib/session";
 import { destinoPosLogin } from "@/lib/fluxos";
-import { MSG, apenasDigitos } from "@/lib/validacao";
+import { MSG, validarLogin } from "@/lib/validacao";
 
 export type EstadoForm = {
   /** Alerta geral (credenciais incorretas). */
   erro?: string;
-  /** Erros de campo obrigatório. */
+  /** Erros de campo (obrigatório, formato, tamanho). */
   erros?: { identificador?: string; senha?: string };
   campos?: { identificador?: string };
 };
@@ -19,28 +19,35 @@ export type EstadoForm = {
 let hashFalso: string | undefined;
 
 export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
-  const identificador = String(formData.get("identificador") ?? "").trim();
-  const senha = String(formData.get("senha") ?? "");
-  const campos = { identificador };
-
-  // Campos obrigatórios (revalidados no servidor, mesmo que o navegador já tenha checado)
-  const erros: NonNullable<EstadoForm["erros"]> = {};
-  if (!identificador) erros.identificador = MSG.identificadorObrigatorio;
-  if (!senha) erros.senha = MSG.senhaObrigatoria;
-  if (erros.identificador || erros.senha) return { erros, campos };
-
-  const porEmail = identificador.includes("@");
-  const usuario = await db.usuario.findUnique({
-    where: porEmail ? { email: identificador.toLowerCase() } : { telefone: apenasDigitos(identificador) },
-    include: { navegante: { select: { ethosStatus: true } } },
-  });
-
-  hashFalso ??= bcrypt.hashSync("navira-dummy", 12);
-  const confere = await bcrypt.compare(senha, usuario?.senhaHash ?? hashFalso);
+  // 1) Validação de entrada no servidor (obrigatório, formato, tamanho). O navegador pode ser contornado.
+  const v = validarLogin(formData);
+  const campos = { identificador: v.identificador };
+  if (!v.valido || !v.chave) return { erros: v.erros, campos };
+
+  // 2) Conferência de credenciais. Falhas de banco não podem derrubar a tela nem vazar detalhes.
+  let usuario;
+  let confere = false;
+  try {
+    usuario = await db.usuario.findUnique({
+      where: v.chave.tipo === "email" ? { email: v.chave.valor } : { telefone: v.chave.valor },
+      include: { navegante: { select: { ethosStatus: true } } },
+    });
+    hashFalso ??= bcrypt.hashSync("navira-dummy", 12);
+    confere = await bcrypt.compare(v.senha, usuario?.senhaHash ?? hashFalso);
+  } catch (e) {
+    console.error("[login] falha ao consultar usuário", e);
+    return { erro: MSG.loginIndisponivel, campos };
+  }
 
   // Mesma mensagem para usuário inexistente e senha errada. Nenhuma sessão é criada: o acesso não avança.
   if (!usuario || !confere) return { erro: MSG.login, campos };
 
+  // 3) Sessão e registro do login.
+  try {
+    await db.usuario.update({ where: { id: usuario.id }, data: { ultimoLoginEm: new Date() } });
+  } catch (e) {
+    console.error("[login] falha ao registrar último login", e); // não impede a entrada
+  }
   await criarSessao({
     sub: usuario.id,
     nome: usuario.nome,
@@ -48,8 +55,6 @@ export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoF
     ethos: usuario.navegante?.ethosStatus === "CONCLUIDO",
   });
 
-  await db.usuario.update({ where: { id: usuario.id }, data: { ultimoLoginEm: new Date() } });
-
-  // Encaminha para o fluxo do agente (ver lib/fluxos.ts).
+  // 4) Encaminha para o fluxo do agente (redirect fica fora do try/catch: ele funciona lançando uma exceção interna).
   redirect(destinoPosLogin(usuario));
 }
diff --git a/src/lib/validacao.ts b/src/lib/validacao.ts
index 525b6ab..71141ff 100644
--- a/src/lib/validacao.ts
+++ b/src/lib/validacao.ts
@@ -23,6 +23,8 @@ export const MSG = {
   telefoneEmUso: "O telefone inserido já está cadastrado.",
   identificadorObrigatorio: "Informe seu e-mail ou telefone.",
   senhaObrigatoria: "Informe sua senha.",
+  senhaLonga: "A senha informada é longa demais.",
+  loginIndisponivel: "Não foi possível entrar agora. Tente novamente em instantes.",
   login: "Usuário ou senha incorretos. Por favor, verifique os dados informados e tente novamente.",
 } as const;
 
@@ -36,6 +38,51 @@ export const cadastroSchema = z.object({
     .optional()
     .transform((v) => v || undefined)
     .refine((v) => v === undefined || z.string().email().safeParse(v).success, MSG.email),
-  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
+  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(72, "A senha deve ter no máximo 72 caracteres."),
   papel: z.enum(PAPEIS_CADASTRAVEIS, { errorMap: () => ({ message: "Escolha quem você é na jornada." }) }),
 });
+
+// ───────── Login ─────────
+
+export const LIMITE_EMAIL = 254;
+export const LIMITE_SENHA = 128; // evita gastar processamento do bcrypt com entradas gigantes
+
+export type ErrosLogin = { identificador?: string; senha?: string };
+export type ChaveLogin = { tipo: "email" | "telefone"; valor: string };
+
+/**
+ * Validação do login compartilhada entre navegador e servidor: obrigatoriedade, formato e tamanho.
+ * Aceita e-mail ou celular (DDD + número) e normaliza o identificador
+ * (e-mail em minúsculas; telefone só com dígitos). Não há limite de tentativas.
+ */
+export function validarCredenciais(identificadorBruto: string, senha: string) {
+  const identificador = identificadorBruto.trim();
+  const erros: ErrosLogin = {};
+  let chave: ChaveLogin | undefined;
+
+  if (!identificador) {
+    erros.identificador = MSG.identificadorObrigatorio;
+  } else if (identificador.includes("@")) {
+    const email = identificador.toLowerCase();
+    if (email.length > LIMITE_EMAIL || !z.string().email().safeParse(email).success) erros.identificador = MSG.email;
+    else chave = { tipo: "email", valor: email };
+  } else if (!/^[\d\s()+-]+$/.test(identificador) || !telefoneValido(identificador)) {
+    erros.identificador = MSG.telefone;
+  } else {
+    chave = { tipo: "telefone", valor: apenasDigitos(identificador) };
+  }
+
+  if (!senha) erros.senha = MSG.senhaObrigatoria;
+  else if (senha.length > LIMITE_SENHA) erros.senha = MSG.senhaLonga;
+
+  return { identificador, senha, chave, erros, valido: !erros.identificador && !erros.senha };
+}
+
+/** Versão do servidor: lê o FormData sem confiar no navegador (arquivos ou valores inesperados contam como vazio). */
+export function validarLogin(fd: FormData) {
+  const texto = (k: string) => {
+    const v = fd.get(k);
+    return typeof v === "string" ? v : "";
+  };
+  return validarCredenciais(texto("identificador"), texto("senha"));
+}
-- 
2.43.0

```
