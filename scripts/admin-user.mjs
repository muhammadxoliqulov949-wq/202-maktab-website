#!/usr/bin/env node
/**
 * Phase 4 — first-admin bootstrap & administrator management.
 *
 *   node scripts/admin-user.mjs create     --email <email> [--role admin] [--inactive]
 *   node scripts/admin-user.mjs list
 *   node scripts/admin-user.mjs deactivate --user-id <uuid>
 *   node scripts/admin-user.mjs activate   --user-id <uuid>
 *   node scripts/admin-user.mjs delete     --user-id <uuid>
 *
 * What it does:
 *   create → creates the Supabase Auth user through the GoTrue admin API
 *            (password is read from STDIN, never from argv) and inserts the
 *            matching `admin_users` row.
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

if (!SUPA || !KEY) fail("SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY muhit o'zgaruvchilari kerak");

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" };

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
}
const flag = (name) => process.argv.includes(`--${name}`);
const command = process.argv[2];

async function readPassword(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const value = await rl.question(prompt);
    return value.trim();
  } finally {
    rl.close();
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

  const password = await readPassword("Yangi admin paroli (kamida 8 belgi): ");
  if (password.length < 8) fail("Parol kamida 8 belgidan iborat bo'lsin");
  const confirm = await readPassword("Parolni takrorlang: ");
  if (password !== confirm) fail("Parollar mos kelmadi");

  const created = await fetch(`${SUPA}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) {
    const detail = await created.text();
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
    console.error(`  Qo'lda qo'shish: node scripts/admin-user.mjs ... yoki SQL editor.`);
    process.exit(1);
  }

  console.log("✓ Admin yaratildi");
  console.log(`  email   : ${email}`);
  console.log(`  userId  : ${user.id}   (auth.users.id — admin_users.user_id)`);
  console.log(`  role    : ${role}`);
  console.log(`  active  : ${!flag("inactive")}`);
  console.log("\nEndi /admin/login orqali kirish mumkin. Parol hech qayerda saqlanmadi va chop etilmadi.");
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
    console.log(`Foydalanish:
  node scripts/admin-user.mjs create     --email <email> [--role admin] [--inactive]
  node scripts/admin-user.mjs list
  node scripts/admin-user.mjs deactivate --user-id <uuid>
  node scripts/admin-user.mjs activate   --user-id <uuid>
  node scripts/admin-user.mjs delete     --user-id <uuid>`);
    process.exit(command ? 1 : 0);
}
