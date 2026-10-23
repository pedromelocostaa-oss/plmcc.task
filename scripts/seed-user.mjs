// Cria o unico usuario do sistema e passa o dono para as linhas ja existentes.
// Uso: npm run seed:user            (le .env.local, que NAO vai para o git)
//      npm run seed:user -- --reset-password
import { createClient } from "@supabase/supabase-js";

const OWNED = [
  "projects", "tasks", "subtasks", "task_tags", "task_comments",
  "project_links", "project_notes", "bookmarks", "purchases", "notes",
  "financas_contas", "financas_cartoes", "financas_categorias", "financas_lancamentos",
  "financas_faturas", "financas_recorrencias", "financas_tags", "financas_orcamentos",
];
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function fail(msg) {
  console.error(`\nERRO: ${msg}\n`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_USER_PASSWORD;
const email = (process.env.SEED_USER_EMAIL ?? "pedromelocostaa@gmail.com").trim().toLowerCase();
const resetPassword = process.argv.includes("--reset-password");

const missing = [
  !url && "SUPABASE_URL",
  !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
  !password && "SEED_USER_PASSWORD",
].filter(Boolean);
if (missing.length) fail(`faltam variaveis em .env.local: ${missing.join(", ")} (veja .env.local.example)`);
if (password.length < 12) fail("SEED_USER_PASSWORD precisa ter 12 ou mais caracteres.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) fail(`nao consegui listar usuarios (a chave e a service_role?): ${listError.message}`);

const others = list.users.filter((u) => (u.email ?? "").toLowerCase() !== email);
if (others.length > 0) {
  fail(`ja existe ${others.length} outro(s) usuario(s). O sistema e de usuario unico: remova-os no painel (Authentication > Users) antes.`);
}

let user = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) fail(`nao consegui criar o usuario: ${error.message}`);
  user = data.user;
  console.log(`Usuario criado: ${email}`);
} else if (resetPassword) {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) fail(`nao consegui trocar a senha: ${error.message}`);
  console.log(`Senha de ${email} atualizada.`);
} else {
  console.log(`Usuario ${email} ja existe; senha mantida (use --reset-password para trocar).`);
}

console.log(`\nDono dos dados: ${user.id}\n`);
console.log("Passando o dono para as linhas existentes:");
for (const table of OWNED) {
  let total = 0;
  for (const filter of [(q) => q.is("user_id", null), (q) => q.eq("user_id", ZERO_UUID)]) {
    const { count, error } = await filter(admin.from(table).update({ user_id: user.id }, { count: "exact" }));
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") { total = null; break; }
      if (error.code === "42703" || error.code === "PGRST204") {
        fail(`a tabela ${table} ainda nao tem a coluna user_id. Rode o passo 1 (20261024000000_auth_step1_add_user_id.sql) primeiro.`);
      }
      fail(`falha em ${table}: ${error.message}`);
    }
    total += count ?? 0;
  }
  console.log(`  ${table.padEnd(24)} ${total === null ? "(tabela nao existe, ignorada)" : `${total} linha(s) atualizada(s)`}`);
}
console.log("\nPronto. Agora rode o passo 2 (20261024000001_auth_step2_rls_lockdown.sql).");
