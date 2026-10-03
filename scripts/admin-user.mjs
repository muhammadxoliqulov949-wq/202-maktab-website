#!/usr/bin/env node
/**
 * Phase 4 — first-admin bootstrap & administrator management.
 *
 *   node scripts/admin-user.mjs create     --email <email> [--role admin] [--inactive]
 *   node scripts/admin-user.mjs link       --email <email>   |  --user-id <uuid>  [--role admin]
 *   node scripts/admin-user.mjs list
 *   node scripts/admin-user.mjs deactivate --user-id <uuid>
 *   node scripts/admin-user.mjs activate   --user-id <uuid>
 *   node scripts/admin-user.mjs delete     --user-id <uuid>
 *
 * What it does:
 *   create → creates the Supabase Auth user through the GoTrue admin API
 *            (password is read from STDIN, never from argv) and inserts the
 *            matching `admin_users` row.
 *   link   → for an Auth user that ALREADY EXISTS: looks it up and inserts only
 *            the `admin_users` row. No password is read, no user is touched,
 *            nothing is deleted. Use this when `create` reports that the user
 *            already exists.
 *
 * This is an OPERATOR tool with the same privileges as the Supabase dashboard.
 * It creates no ambient credential, no backdoor and no hardcoded admin: delete
 * the `admin_users` row (or the Auth user) and access is gone immediately.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Never prints the password or any key.
 */
import { createInterface } from "node:readline/promises";

const SUPA = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const command = process.argv[2];

/**
 * Usage must be readable without credentials: an operator following the bootstrap
 * docs starts with `--help`, and failing that with "keys required" only teaches
 * them to put a service-role key somewhere it may get logged.
 */
function usage() {
  console.log(`Foydalanish:
  node scripts/admin-user.mjs create     --email <email> [--role admin] [--inactive]
  node scripts/admin-user.mjs link       --email <email> | --user-id <uuid> [--role admin]
  node scripts/admin-user.mjs list
  node scripts/admin-user.mjs deactivate --user-id <uuid>
  node scripts/admin-user.mjs activate   --user-id <uuid>
  node scripts/admin-user.mjs delete     --user-id <uuid>

  create — yangi Auth foydalanuvchi + admin_users yozuvi (parol STDIN'dan)
  link   — ALLAQACHON MAVJUD Auth foydalanuvchiga faqat admin_users yozuvini
           qo'shadi (parol so'ralmaydi, hech narsa o'chirilmaydi)

Talab qilinadi: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env.local'dan yoki env orqali).
Kalitlar va parollar hech qachon chop etilmaydi.`);
}

if (!command || command === "help" || command === "--help" || command === "-h") {
  usage();
  process.exit(0);
}

if (!SUPA || !KEY) fail("SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY muhit o'zgaruvchilari kerak");

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" };

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}
const flag = (name) => process.argv.includes(`--${name}`);

/**
 * Sequential STDIN prompts that work interactively AND piped.
 *
 * The original implementation built a fresh `readline.Interface` per prompt, and
 * Node's `rl.question()` answers exactly ONE question on a non-TTY stream — the
 * remaining input is dropped and 'close' fires. Piped together, `create` printed
 * both prompts, made ZERO API calls and died on an unsettled top-level await
 * (exit 13) or exited 0 having done nothing: a bootstrap command that looks like
 * it ran. So the interface is built once and its `line` events are queued by
 * hand — every line survives, and an ended stream rejects instead of hanging.
 */
function makePrompter() {
  const rl = createInterface({ input: process.stdin, output: process.stderr, autoClose: false });
  const lines = [];
  const waiting = [];
  let ended = false;

  rl.on("line", (line) => {
    if (waiting.length) waiting.shift()(line);
    else lines.push(line);
  });
  rl.on("close", () => {
    ended = true;
    while (waiting.length) waiting.shift()(null);
  });

  return {
    async ask(prompt) {
      process.stderr.write(prompt);
      if (lines.length) return String(lines.shift()).trim();
      if (ended) throw new Error("STDIN yopiq — parol o'qilmadi");
      const line = await new Promise((resolve) => waiting.push(resolve));
      if (line === null) throw new Error("STDIN tugadi — parol o'qilmadi");
      return String(line).trim();
    },
    close: () => {
      if (!ended) rl.close();
      // Drop any buffered secret from the closure's own memory.
      lines.length = 0;
    },
  };
}

const prompter = makePrompter();

/** Reads a secret from STDIN. Never echoed back, never taken from argv, never logged. */
async function readPassword(prompt) {
  try {
    return await prompter.ask(prompt);
  } catch (e) {
    fail(`${e.message}. Interaktiv terminalda ishga tushiring yoki: printf 'parol\\nparol\\n' | node scripts/admin-user.mjs create …`);
  }
}

const rest = async (table, { method = "GET", qs = "", body, prefer } = {}) => {
  const res = await fetch(`${SUPA}/rest/v1/${table}?${qs}`, {
    method,
    headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
};

const mask = (email = "") => {
  const [name, domain] = String(email).split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
};

async function create() {
  const email = arg("email");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("--email <to'g'ri email> kerak");
  const role = arg("role") ?? "admin";

  const roles = await rest("admin_roles", { qs: "select=role" });
  if (roles.status !== 200 || !Array.isArray(roles.json) || !roles.json.some((r) => r.role === role)) {
    fail(`"${role}" roli admin_roles jadvalida yo'q (0004_auth.sql qo'llanilmagan bo'lishi mumkin)`);
  }

  let password = "";
  let confirm = "";
  try {
    password = await readPassword("Yangi admin paroli (kamida 8 belgi): ");
    if (password.length < 8) fail("Parol kamida 8 belgidan iborat bo'lsin");
    confirm = await readPassword("Parolni takrorlang: ");
    if (password !== confirm) fail("Parollar mos kelmadi");
  } finally {
    prompter.close();
  }

  const created = await fetch(`${SUPA}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) {
    const detail = await created.text();
    if (/already exists|already_registered|user already/i.test(detail) || created.status === 422) {
      console.error(`✗ Supabase Auth'da ${mask(email)} allaqachon mavjud — parol so'ramayman va hech narsani o'zgartirmayman.`);
      console.error(`  Mavjud foydalanuvchiga admin yozuvini qo'shish:`);
      console.error(`    node scripts/admin-user.mjs link --email ${email} --role ${role}`);
      console.error(`  yoki aniq UUID bilan (dashboard → Authentication → Users → Copy UUID):`);
      console.error(`    node scripts/admin-user.mjs link --user-id <uuid> --role ${role}`);
      process.exit(1);
    }
    fail(`Supabase Auth foydalanuvchi yaratilmadi (HTTP ${created.status}) — ${detail.slice(0, 120)}`);
  }
  const user = await created.json();

  const row = await rest("admin_users", {
    method: "POST",
    prefer: "return=representation,resolution=merge-duplicates",
    body: { user_id: user.id, email: email.toLowerCase(), role, is_active: !flag("inactive") },
  });
  if (row.status !== 200 && row.status !== 201) {
    console.error(`! Auth foydalanuvchi yaratildi (${user.id}), lekin admin_users yozuvi qo'shilmadi (HTTP ${row.status}).`);
    console.error(`  Yozuvni qo'shish uchun: node scripts/admin-user.mjs link --user-id ${user.id} --role ${role}`);
    process.exit(1);
  }

  console.log("✓ Admin yaratildi");
  console.log(`  email   : ${email}`);
  console.log(`  userId  : ${user.id}   (auth.users.id — admin_users.user_id)`);
  console.log(`  role    : ${role}`);
  console.log(`  active  : ${!flag("inactive")}`);
  console.log("\nEndi /admin/login orqali kirish mumkin. Parol hech qayerda saqlanmadi va chop etilmadi.");
}

/** UUID shakli — xato yozuvli `--user-id` bazaga so'rov yuborilmasin. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function assertRoleExists(role) {
  const roles = await rest("admin_roles", { qs: "select=role" });
  if (roles.status !== 200 || !Array.isArray(roles.json) || !roles.json.some((r) => r.role === role)) {
    fail(`"${role}" roli admin_roles jadvalida yo'q (0004_auth.sql qo'llanilmagan bo'lishi mumkin)`);
  }
}

/**
 * GoTrue's admin list endpoint has no dependable e-mail filter, so we page
 * through it and match locally. Read-only and bounded (20 × 1000 users) —
 * a full-table scan of a school project's auth list is not, and this never
 * writes anything.
 */
async function findAuthUserByEmail(email) {
  const want = String(email).toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${SUPA}/auth/v1/admin/users?page=${page}&perPage=1000`, { headers });
    if (!res.ok) fail(`GoTrue admin API ro'yxatni qaytarmadi (HTTP ${res.status}) — --user-id <uuid> bilan urinib ko'ring`);
    const body = await res.json().catch(() => null);
    const users = Array.isArray(body) ? body : (body?.users ?? []);
    const hit = users.find((u) => String(u.email ?? "").toLowerCase() === want);
    if (hit) return hit;
    if (users.length < 1000) return null;
  }
  return null;
}

/**
 * link — attach an `admin_users` row to an EXISTING Supabase Auth user.
 *
 * Why this exists: `create` must POST to /auth/v1/admin/users, and GoTrue
 * rejects an e-mail that is already registered. An operator who signed up in
 * the dashboard (or who was invited earlier) would otherwise be stuck exactly at
 * the last step of the bootstrap. This path needs no password, modifies no user
 * record and deletes nothing: it writes one row, or reports that it already
 * exists.
 */
async function link() {
  const emailArg = arg("email");
  const idArg = arg("user-id");
  if (!emailArg && !idArg) fail("--email <email> yoki --user-id <uuid> kerak");
  if (emailArg && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailArg)) fail("--email <to'g'ri email> kerak");
  if (idArg && !UUID_RE.test(idArg)) fail("--user-id <uuid> formati noto'g'ri");
  const role = arg("role") ?? "admin";

  await assertRoleExists(role);

  let user = null;
  if (idArg) {
    const res = await fetch(`${SUPA}/auth/v1/admin/users/${idArg}`, { headers });
    if (!res.ok) fail(`Auth foydalanuvchi topilmadi: ${idArg} (HTTP ${res.status})`);
    user = await res.json().catch(() => null);
  } else {
    user = await findAuthUserByEmail(emailArg);
    if (!user) fail(`${mask(emailArg)} Auth'da topilmadi — avval yarating: node scripts/admin-user.mjs create --email ${emailArg} --role ${role}`);
  }
  if (!user?.id) fail("GoTrue javobida foydalanuvchi identifikatori yo'q");

  const email = String(emailArg ?? user.email ?? "").toLowerCase();
  if (!email) fail("email aniq emas — --email <email> ni ko'rsating");

  const existing = await rest("admin_users", { qs: `select=id,role,is_active&user_id=eq.${user.id}` });
  if (Array.isArray(existing.json) && existing.json.length > 0) {
    const cur = existing.json[0];
    if (cur.role === role && cur.is_active) {
      console.log(`✓ Allaqachon admin: ${mask(email)} — userId ${user.id}, rol "${role}", faol. Hech narsa o'zgartirilmadi.`);
      return;
    }
    console.log(`! ${mask(email)} uchun admin_users yozuvi mavjud (rol "${cur.role}", faol:${cur.is_active}) — "${role}" ga yangilanadi.`);
  }

  const row = await rest("admin_users", {
    method: "POST",
    prefer: "return=representation,resolution=merge-duplicates",
    body: { user_id: user.id, email, role, is_active: true },
  });
  if (row.status !== 200 && row.status !== 201) fail(`admin_users yozuvi yozilmadi (HTTP ${row.status})`);

  console.log("✓ Mavjud Auth foydalanuvchi adminga biriktirildi");
  console.log(`  email   : ${email}`);
  console.log(`  userId  : ${user.id}   (auth.users.id — admin_users.user_id)`);
  console.log(`  role    : ${role}`);
  console.log(`  active  : true`);
  console.log("\nAuth yozuviga tegilmadi, parol so'ralmadi, hech narsa o'chirilmadi.");
  console.log("Endi /admin/login orqali kirish mumkin (parol — o'sha foydalanuvchining mavjud parametri).");
}

async function list() {
  const res = await rest("admin_users", { qs: "select=id,user_id,email,role,is_active,last_login_at&order=created_at.desc" });
  if (res.status !== 200) fail(`admin_users o'qilmadi (HTTP ${res.status})`);
  const rows = res.json ?? [];
  if (rows.length === 0) {
    console.log("(admin_users bo'sh — birinchi adminni yarating: node scripts/admin-user.mjs create --email <email>)");
    return;
  }
  console.log(`${rows.length} ta admin:\n`);
  for (const r of rows) {
    console.log(`  ${r.is_active ? "✓" : "✗"} ${mask(r.email)}`);
    console.log(`      userId : ${r.user_id}`);
    console.log(`      role   : ${r.role}`);
    console.log(`      login  : ${r.last_login_at ?? "—"}`);
  }
}

async function setActive(active) {
  const userId = arg("user-id");
  if (!userId) fail("--user-id <uuid> kerak");
  const found = await rest("admin_users", { qs: `select=id&user_id=eq.${encodeURIComponent(userId)}` });
  const id = Array.isArray(found.json) ? found.json[0]?.id : null;
  if (!id) fail("admin_users yozuvi topilmadi");
  const res = await rest("admin_users", { method: "PATCH", qs: `id=eq.${id}`, prefer: "return=representation", body: { is_active: active } });
  if (res.status !== 200) fail(`yangilanmadi (HTTP ${res.status})`);
  console.log(`✓ ${active ? "Faollashtirildi" : "O'chirildi"} — keyingi API so'rovi darhol ${active ? "ruxsat beradi" : "403 qaytaradi"}.`);
}

async function remove() {
  const userId = arg("user-id");
  if (!userId) fail("--user-id <uuid> kerak");
  const found = await rest("admin_users", { qs: `select=id&user_id=eq.${encodeURIComponent(userId)}` });
  const id = Array.isArray(found.json) ? found.json[0]?.id : null;
  if (!id) fail("admin_users yozuvi topilmadi");
  const res = await rest("admin_users", { method: "DELETE", qs: `id=eq.${id}` });
  if (res.status !== 204 && res.status !== 200) fail(`o'chirilmadi (HTTP ${res.status})`);
  console.log("✓ admin_users yozuvi o'chirildi (Auth foydalanuvchisi saqlanib qoldi).");
  console.log("  Auth foydalanuvchisini ham o'chirish: Supabase dashboard → Authentication → Users.");
}

switch (command) {
  case "create":
    await create();
    break;
  case "link":
    await link();
    break;
  case "list":
    await list();
    break;
  case "deactivate":
    await setActive(false);
    break;
  case "activate":
    await setActive(true);
    break;
  case "delete":
    await remove();
    break;
  default:
    usage();
    process.exit(1);
}
