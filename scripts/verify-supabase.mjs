/**
 * Real-Supabase verification — GitHub Actions / lokal uchun (Phase 3 + Phase 4).
 *
 * PHASE 3 (saqlangan):
 *  1) Supabase REST: jadvallar mavjudligi + qator sonlari
 *  2) Server DATA_PROVIDER=supabase bilan ishga tushadi
 *  3) Public API real bazadan o'qiydi
 *  4) Admin CRUD smoke (o'z-o'zini tozalaydi) + audit + murojaatlar
 *  5) Cache invalidation
 *  6) Tezlik
 *
 * PHASE 4 (yangi):
 *  7) Sxema: admin_users / admin_roles + audit ustunlari + RLS + Storage siyosatlari
 *  8) Haqiqiy Supabase Auth bilan login (parol) → HttpOnly sessiya cookie
 *  9) /admin sahifa himoyasi: anonim → redirect, non-admin → 403, faol emas → 403, admin → 200
 * 10) /api/v1/admin/* himoyasi: 401 / 403 / 403 / 200 (to'g'ridan-to'g'ri so'rovlar)
 * 11) CSRF double-submit
 * 12) Ruxsat etilgan CRUD + audit'da HAQIQIY user id
 * 13) Logout → sessiya bekor
 * 14) RLS: anonim kalit bilan shaxsiy jadvallar o'qilmaydi; foydalanuvchi faqat o'z admin_users yozuvini ko'radi
 * 15) Public API regressiyasi
 *
 * Maxfiylik: hech qachon SUPABASE_SERVICE_ROLE_KEY, parol, access/refresh token
 * yoki cookie qiymatini konsolga chiqarmaydi.
 *
 * Talab: `npm run build` oldin bajarilgan bo'lsin. Muhit:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (majburiy)
 *   SUPABASE_ANON_KEY (ixtiyoriy — bo'lmasa RLS testlari qisqartiriladi)
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const SUPA = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!SUPA || !KEY) {
  console.error("✗ SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY muhit o'zgaruvchilari kerak");
  process.exit(1);
}

/**
 * Ixtiyoriy: migratsiyani Supabase Management API orqali avtomatik qo'llash.
 * Faqat SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF berilganda ishlaydi
 * (GitHub Actions secret sifatida). Token hech qachon chop etilmaydi.
 * Migratsiya idempotent — qayta ishga tushirish xavfsiz.
 */
async function applyMigration(file) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) {
    console.log("· Migratsiya avtomatik qo'llanmadi (SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF yo'q) — SQL editor orqali qo'lda qo'llang.");
    return null;
  }
  const { readFileSync } = await import("node:fs");
  const sql = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 160)}` };
  }
  return { ok: true };
}

let phase4SchemaReady = false;

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---------------- Supabase REST / Auth yordamchilari ---------------- */

const restHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" };

async function tableCount(table) {
  const res = await fetch(`${SUPA}/rest/v1/${table}?select=*`, {
    headers: { ...restHeaders, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) return { error: `${res.status}` };
  const total = res.headers.get("content-range")?.split("/")[1];
  return { count: total === "*" ? null : Number(total) };
}

async function rest(table, { method = "GET", qs = "", body, prefer, headers } = {}) {
  return fetch(`${SUPA}/rest/v1/${table}?${qs}`, {
    method,
    headers: { ...restHeaders, ...(prefer ? { Prefer: prefer } : {}), ...(headers ?? {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function createAuthUser(email, password) {
  const res = await fetch(`${SUPA}/auth/v1/admin/users`, {
    method: "POST",
    headers: restHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`createAuthUser failed (${res.status})`);
  return (await res.json()).id;
}

/**
 * Smoke-test rows must never survive a run. If a run aborts before its own
 * cleanup (e.g. the admin API is unavailable), a leftover "CI Smoke" submission
 * would make the exact-count assertion fail on the NEXT run. Deleted both
 * up-front and in `finally`. The space is percent-encoded on purpose: an
 * unencoded space in the query string is not reliably handled by PostgREST.
 */
async function cleanupSmokeRows(where = "") {
  const qs = "name=eq." + encodeURIComponent("CI Smoke");
  const found = await rest("contact_submissions", { qs: `select=id&${qs}` });
  const rows = await found.json().catch(() => null);
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  await rest("contact_submissions", { method: "DELETE", qs });
  console.log(`· ${where}qolgan ${rows.length} ta "CI Smoke" murojaati tozalandi`);
  return rows.length;
}

async function deleteAuthUser(id) {
  await fetch(`${SUPA}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: restHeaders }).catch(() => {});
}

/** Sign in straight against GoTrue — used to build a session for a NON-admin. */
async function goTrueSignIn(email, password) {
  const res = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  return res.json();
}

/* ---------------- app server ---------------- */

const PORT = 3202;
const BASE = `http://127.0.0.1:${PORT}`;

function startServer() {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    cwd: new URL("..", import.meta.url).pathname,
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATA_PROVIDER: "supabase",
      RATE_LIMIT_ADMIN_MAX: "10000",
      RATE_LIMIT_PUBLIC_READ_MAX: "100000",
      RATE_LIMIT_CONTACT_MAX: "1000",
      RATE_LIMIT_LOGIN_MAX: "10000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", () => {});
  child.stderr.on("data", (d) => process.stderr.write(`[srv!] ${d}`));
  return child;
}

async function waitReady() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/v1/health`);
      if (r.ok) return true;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/* ---------------- cookie jar ---------------- */

class Jar {
  constructor() {
    this.map = new Map();
  }
  absorb(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = line.split(";");
      const i = pair.indexOf("=");
      if (i === -1) continue;
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      const gone = attrs.some((a) => /^\s*max-age=0\s*$/i.test(a)) || value === "";
      if (gone) this.map.delete(name);
      else this.map.set(name, value);
    }
    return this;
  }
  header() {
    return Array.from(this.map, ([k, v]) => `${k}=${v}`).join("; ");
  }
  get(n) {
    return this.map.get(n) ?? "";
  }
  has(n) {
    return this.map.has(n);
  }
}

const pub = async (path) => {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, body: await r.json().catch(() => null) };
};

/* ---------------- main ---------------- */

let server = null;
let exitCode = 0;
const created = { authUsers: [], adminRows: [], articles: [], submissions: [] };

try {
  /* ============ 0) Phase 4 migratsiyasi (ixtiyoriy auto-apply) ============ */
  const applied = await applyMigration("0004_auth.sql");
  if (applied) check("migratsiya 0004_auth.sql qo'llandi", applied.ok, applied.detail ?? "Management API orqali");

  /* ============ 0b) oldingi yugurish qoldiqlari ============ */
  await cleanupSmokeRows("oldingi yugurishdan ");

  /* ============ 1) jadvallar ============ */
  console.log(`\n── Supabase REST tekshiruvi: ${new URL(SUPA).host}\n`);
  const EXPECTED = {
    site_settings: 1,
    contact_information: 1,
    news_categories: 5,
    gallery_categories: 6,
    statistics: 4,
    features: 6,
    facilities: 5,
    team_members: 16,
    gallery_items: 13,
    quick_links: 6,
    faqs: 5,
    news_articles: 6,
    contact_submissions: 0,
    media_assets: 0,
    // append-only jurnallar — aniq son tekshirilmaydi
    admin_audit_logs: null,
    // Phase 4: ma'murlar katalogi (miqdori loyihaga bog'liq)
    admin_users: null,
    admin_roles: null,
  };
  for (const [table, expected] of Object.entries(EXPECTED)) {
    const { count, error } = await tableCount(table);
    if (error !== undefined) {
      check(`jadval: ${table}`, false, `REST xato (${error}) — migratsiya qo'llanilmagan bo'lishi mumkin`);
    } else if (expected === null) {
      check(`jadval: ${table}`, typeof count === "number", `${count} qator`);
    } else {
      check(`jadval: ${table}`, count === expected, `${count} qator (kutilgan ${expected})`);
    }
  }

  /* ============ 7) Phase 4 sxemasi ============ */
  console.log("\n── Phase 4 sxemasi (admin_users / admin_roles / audit)\n");
  {
    const roles = await rest("admin_roles", { qs: "select=role,permissions" });
    const rolesBody = await roles.json().catch(() => null);
    const adminRole = Array.isArray(rolesBody) ? rolesBody.find((r) => r.role === "admin") : null;
    check("admin_roles: 'admin' roli mavjud", Boolean(adminRole), adminRole ? `${adminRole.permissions?.length ?? 0} ta ruxsat` : "");

    const usersProbe = await rest("admin_users", { qs: "select=id,user_id,email,role,is_active&limit=1" });
    check("admin_users jadvali mavjud", usersProbe.status === 200, `HTTP ${usersProbe.status}`);

    const auditProbe = await rest("admin_audit_logs", { qs: "select=admin_user_id,admin_email,ip_address&limit=1" });
    check("admin_audit_logs: admin_user_id/admin_email/ip_address ustunlari bor", auditProbe.status === 200, `HTTP ${auditProbe.status}`);

    // Migration qo'llanilmagan bo'lsa — bitta aniq, amalga oshiriladigan xabar.
    phase4SchemaReady = usersProbe.status === 200 && Boolean(adminRole);
    if (!phase4SchemaReady) {
      console.log("");
      console.log("┌──────────────────────────────────────────────────────────────────────────┐");
      console.log("│  0004_auth.sql HAQIQIY LOYIHAGA QO'LLANMAGAN.                            │");
      console.log("│  admin_users / admin_roles jadvallari yo'q, shuning uchun Phase 4 auth   │");
      console.log("│  tekshiruvlari ishlamaydi. Bitta qadam kerak:                            │");
      console.log("│                                                                          │");
      console.log("│  Supabase dashboard → SQL Editor → supabase/migrations/0004_auth.sql     │");
      console.log("│  faylini to'liq paste qiling → Run.  (idempotent, qayta ishlatsa bo'ladi)│");
      console.log("│                                                                          │");
      console.log("│  Yoki repo secret'lariga SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF    │");
      console.log("│  qo'shing — shunda bu skript migratsiyani o'zi qo'llaydi.                │");
      console.log("└──────────────────────────────────────────────────────────────────────────┘");
      console.log("");
    }
  }

  /* ============ 2) server ============ */
  console.log("\n── Server (DATA_PROVIDER=supabase)\n");
  server = startServer();
  const ready = await waitReady();
  check("server ishga tushdi", ready);
  if (!ready) throw new Error("server did not start");

  /* ============ 3) public API ============ */
  const news = await pub("/api/v1/news");
  check("GET /api/v1/news", news.status === 200 && Array.isArray(news.body?.data), `${news.body?.data?.length ?? "?"} ta yangilik`);
  check("yangilik slug detail", (await pub("/api/v1/news/yangi-oquv-yili-2026")).status === 200);
  const team = await pub("/api/v1/team?limit=50");
  const teamIds = new Set((team.body?.data ?? []).map((m) => m.id));
  const missingTeam = ["p-13", "p-14", "p-15", "p-16"].filter((id) => !teamIds.has(id));
  check(
    "GET /api/v1/team",
    team.status === 200 && team.body?.data?.length === 16 && team.body?.meta?.total === 16 && missingTeam.length === 0,
    `${team.body?.data?.length ?? "?"} ta a'zo (meta.total=${team.body?.meta?.total ?? "?"}, kutilgan 16)` +
      (missingTeam.length ? ` — yetishmayapti: ${missingTeam.join(", ")}` : "")
  );
  const faqs = await pub("/api/v1/faqs");
  check("GET /api/v1/faqs", faqs.status === 200 && faqs.body?.data?.items?.length === 5);
  const cfg = await pub("/api/v1/site-config");
  check("GET /api/v1/site-config", cfg.body?.data?.name === "202-maktab", `name=${cfg.body?.data?.name}`);
  const ci = await pub("/api/v1/contact-info");
  check("contact-info koordinatalari", ci.body?.data?.map?.latitude === 41.2797, `lat=${ci.body?.data?.map?.latitude}`);

  /* ============ 8-14) Phase 4 auth ============ */
  console.log("\n── Phase 4: Supabase Auth + authorization (real loyiha)\n");

  const stamp = Date.now().toString(36);
  const P = {
    admin: `ci-admin-${stamp}@example.com`,
    plain: `ci-plain-${stamp}@example.com`,
    inactive: `ci-inactive-${stamp}@example.com`,
  };
  const PW = {
    admin: `Ci-${randomUUID().slice(0, 12)}!a`,
    plain: `Ci-${randomUUID().slice(0, 12)}!p`,
    inactive: `Ci-${randomUUID().slice(0, 12)}!i`,
  };

  const ids = {};
  for (const kind of ["admin", "plain", "inactive"]) {
    ids[kind] = await createAuthUser(P[kind], PW[kind]);
    created.authUsers.push(ids[kind]);
  }
  check("Supabase Auth: test foydalanuvchilari yaratildi", Boolean(ids.admin && ids.plain && ids.inactive));

  for (const kind of ["admin", "inactive"]) {
    const r = await rest("admin_users", {
      method: "POST",
      prefer: "return=representation,resolution=merge-duplicates",
      body: { user_id: ids[kind], email: P[kind], role: "admin", is_active: kind === "admin" },
    });
    const body = await r.json().catch(() => null);
    const row = Array.isArray(body) ? body[0] : null;
    if (row?.id) created.adminRows.push(row.id);
    check(`admin_users yozuvi: ${kind}`, r.status === 201 || r.status === 200, `HTTP ${r.status}`);
  }
  {
    const plainRow = await rest("admin_users", { qs: `select=id&user_id=eq.${ids.plain}` });
    const plainRows = await plainRow.json().catch(() => null);
    check("admin_users: non-admin uchun yozuv YO'Q (ataylab)", Array.isArray(plainRows) && plainRows.length === 0, `${Array.isArray(plainRows) ? plainRows.length : "?"} qator`);
  }

  const appLogin = async (email, password) => {
    const res = await fetch(`${BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const jar = new Jar().absorb(res);
    return { res, jar, body: await res.json().catch(() => null) };
  };

  // 8) login
  const adminLogin = await appLogin(P.admin, PW.admin);
  check("login (admin) → 200", adminLogin.res.status === 200, `HTTP ${adminLogin.res.status}`);
  check("login: sessiya + CSRF cookie o'rnatildi", adminLogin.jar.has("m202_session") && adminLogin.jar.has("m202_csrf"));
  const setCookie = adminLogin.res.headers.getSetCookie().join("\n");
  check("sessiya cookie HttpOnly + SameSite=Lax + Secure", /m202_session=[\s\S]*httponly/i.test(setCookie) && /samesite=lax/i.test(setCookie) && /secure/i.test(setCookie));
  check("login javobida token YO'Q", !JSON.stringify(adminLogin.body).includes("token"));

  const badLogin = await appLogin(P.admin, "not-the-password");
  check("login: noto'g'ri parol → 401 + umumiy xabar", badLogin.res.status === 401 && badLogin.body?.error?.message === "Login failed. Please check your email and password.");
  const ghostLogin = await appLogin(`ci-ghost-${stamp}@example.com`, "whatever-1234");
  check("login: mavjud bo'lmagan foydalanuvchi → bir xil 401 (enumeratsiya yo'q)", ghostLogin.res.status === 401 && ghostLogin.body?.error?.message === badLogin.body?.error?.message);

  const plainLogin = await appLogin(P.plain, PW.plain);
  check("login: non-admin → 403", plainLogin.res.status === 403, `HTTP ${plainLogin.res.status}`);
  const inactiveLogin = await appLogin(P.inactive, PW.inactive);
  check("login: faol bo'lmagan admin → 403", inactiveLogin.res.status === 403, `HTTP ${inactiveLogin.res.status}`);

  // 9) /admin sahifa himoyasi
  const anonPage = await fetch(`${BASE}/admin`, { redirect: "manual" });
  check("/admin (anonim) → login'ga redirect", [301, 302, 303, 307, 308].includes(anonPage.status) && /\/admin\/login/.test(anonPage.headers.get("location") ?? ""), `HTTP ${anonPage.status}`);
  const loginPage = await fetch(`${BASE}/admin/login`);
  check("/admin/login ochiq (200)", loginPage.status === 200);
  const plainPage = await fetch(`${BASE}/admin`, { headers: { cookie: plainLogin.jar.header() } });
  check("/admin (non-admin) → 403", plainPage.status === 403, `HTTP ${plainPage.status}`);
  const inactivePage = await fetch(`${BASE}/admin`, { headers: { cookie: inactiveLogin.jar.header() } });
  check("/admin (faol emas) → 403", inactivePage.status === 403, `HTTP ${inactivePage.status}`);
  const adminPage = await fetch(`${BASE}/admin`, { headers: { cookie: adminLogin.jar.header() } });
  const adminPageHtml = await adminPage.text();
  check("/admin (faol admin) → 200", adminPage.status === 200 && adminPageHtml.includes(P.admin), `HTTP ${adminPage.status}`);

  // 10) API himoyasi
  const apiAnon = await fetch(`${BASE}/api/v1/admin/dashboard`);
  check("API (sessiyasiz) → 401", apiAnon.status === 401, `HTTP ${apiAnon.status}`);
  const apiPlain = await fetch(`${BASE}/api/v1/admin/dashboard`, { headers: { cookie: plainLogin.jar.header() } });
  check("API (non-admin) → 403", apiPlain.status === 403, `HTTP ${apiPlain.status}`);
  const apiInactive = await fetch(`${BASE}/api/v1/admin/dashboard`, { headers: { cookie: inactiveLogin.jar.header() } });
  check("API (faol emas) → 403", apiInactive.status === 403, `HTTP ${apiInactive.status}`);

  const adminHeaders = { "content-type": "application/json", cookie: adminLogin.jar.header(), "x-csrf-token": adminLogin.jar.get("m202_csrf") };
  const apiAdmin = await fetch(`${BASE}/api/v1/admin/dashboard`, { headers: adminHeaders });
  check("API (faol admin) → 200", apiAdmin.status === 200, `HTTP ${apiAdmin.status}`);

  // 11) CSRF
  const noCsrf = await fetch(`${BASE}/api/v1/admin/news`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminLogin.jar.header() },
    body: JSON.stringify({ title: "CI CSRF probe", isPublished: false }),
  });
  check("CSRF token'siz mutatsiya → 403", noCsrf.status === 403, `HTTP ${noCsrf.status}`);

  /* ============ 4 + 12) CRUD smoke + audit user id ============ */
  console.log("\n── Admin CRUD smoke (real sessiya bilan, cleanup)\n");
  const slug = `ci-smoke-${stamp}`;
  let articleId = null;
  try {
    const createRes = await fetch(`${BASE}/api/v1/admin/news`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ title: "CI smoke yangilik", slug, excerpt: "ci", isPublished: false }),
    });
    check("draft yaratildi (201)", createRes.status === 201);
    articleId = (await createRes.json())?.data?.id;
    if (articleId) created.articles.push(articleId);

    const hiddenList = await pub("/api/v1/news");
    check("draft public'da YO'Q", !hiddenList.body?.data?.some((n) => n.slug === slug));

    const publishRes = await fetch(`${BASE}/api/v1/admin/news/${articleId}`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ isPublished: true }) });
    check("publish (200)", publishRes.status === 200);

    const shownList = await pub("/api/v1/news");
    check("publish'dan keyin public'da BOR", shownList.body?.data?.some((n) => n.slug === slug));
    check("public detail 200", (await pub(`/api/v1/news/${slug}`)).status === 200);

    const audit = await (await fetch(`${BASE}/api/v1/admin/audit-log?limit=20`, { headers: adminHeaders })).json();
    const publishRow = audit.data?.find((a) => a.action === "PUBLISH" && a.entityType === "news" && a.entityId === articleId);
    check("audit: PUBLISH yozuvi bor", Boolean(publishRow));
    check("audit: HAQIQIY Supabase user id yozilgan", publishRow?.adminUserId === ids.admin, `adminUserId=${publishRow?.adminUserId ? "bor" : "yo'q"}`);
    check("audit: admin_email yozilgan", publishRow?.adminEmail === P.admin);
    const auditBlob = JSON.stringify(audit.data ?? []).toLowerCase();
    check(
      "audit: parol/token/service key YO'Q",
      !auditBlob.includes("password") && !auditBlob.includes("access_token") && !auditBlob.includes("refresh_token") && !auditBlob.includes("service_role")
    );
    const loginRow = audit.data?.find((a) => a.action === "LOGIN");
    check("audit: LOGIN yozuvi haqiqiy user id bilan", loginRow?.adminUserId === ids.admin);

    const delRes = await fetch(`${BASE}/api/v1/admin/news/${articleId}?hard=true`, { method: "DELETE", headers: adminHeaders });
    check("hard delete (200)", delRes.status === 200);
    check("o'chirilgach public 404", (await pub(`/api/v1/news/${slug}`)).status === 404);
    created.articles.length = 0;
    articleId = null;
  } finally {
    for (const id of created.articles) {
      await fetch(`${BASE}/api/v1/admin/news/${id}?hard=true`, { method: "DELETE", headers: adminHeaders }).catch(() => {});
    }
  }

  // murojaat smoke
  {
    const post = await fetch(`${BASE}/api/v1/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "CI Smoke", contact: "ci@example.com", topic: "other", message: "CI smoke murojaati — o'chiriladi." }),
    });
    check("contact POST 200 (jim)", post.status === 200);
    const inbox = await (await fetch(`${BASE}/api/v1/admin/contact-submissions?limit=20`, { headers: adminHeaders })).json();
    const item = inbox.data?.find((s) => s.name === "CI Smoke");
    check("murojaat inboxda (real DB)", Boolean(item));
    if (item) {
      created.submissions.push(item.id);
      await fetch(`${BASE}/api/v1/admin/contact-submissions/${item.id}`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "resolved" }) });
      const del = await fetch(`${BASE}/api/v1/admin/contact-submissions/${item.id}`, { method: "DELETE", headers: adminHeaders });
      check("murojaat cleanup (delete 200)", del.status === 200);
      created.submissions.length = 0;
    }
  }

  /* ============ 5) cache invalidation ============ */
  {
    const orig = await (await fetch(`${BASE}/api/v1/admin/settings`, { headers: adminHeaders })).json();
    const originalTagline = orig.data?.tagline;
    try {
      await fetch(`${BASE}/api/v1/admin/settings`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ tagline: "CI smoke shiori" }) });
      const after = await pub("/api/v1/site-config");
      check("cache invalidation: patch public'ga aks etdi", after.body?.data?.tagline === "CI smoke shiori");
    } finally {
      await fetch(`${BASE}/api/v1/admin/settings`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ tagline: originalTagline ?? "" }) });
      const restored = await pub("/api/v1/site-config");
      check("settings tiklandi", restored.body?.data?.tagline === originalTagline);
    }
  }

  /* ============ 13) logout ============ */
  {
    const out = await fetch(`${BASE}/api/v1/auth/logout`, { method: "POST", headers: adminHeaders });
    check("logout → 200", out.status === 200);
    const cleared = new Jar().absorb(out);
    check("logout cookie'larni tozaladi", !cleared.has("m202_session") && !cleared.has("m202_csrf"));
    const after = await fetch(`${BASE}/api/v1/admin/dashboard`, { headers: { cookie: adminLogin.jar.header() } });
    check("logout'dan keyin eski sessiya → 401", after.status === 401, `HTTP ${after.status}`);

    // LOGOUT yozuvini tekshirish uchun yangi sessiya kerak (eskisi bekor qilingan).
    const reLogin = await appLogin(P.admin, PW.admin);
    const reHeaders = { "content-type": "application/json", cookie: reLogin.jar.header(), "x-csrf-token": reLogin.jar.get("m202_csrf") };
    const logoutAudit = await (await fetch(`${BASE}/api/v1/admin/audit-log?limit=10&action=LOGOUT`, { headers: reHeaders })).json();
    const logoutRow = (logoutAudit.data ?? [])[0];
    check("audit: LOGOUT yozuvi bor", Boolean(logoutRow));
    check("audit: LOGOUT haqiqiy user id bilan", logoutRow?.adminUserId === ids.admin);
  }

  /* ============ 14) RLS ============ */
  console.log("\n── Phase 4: RLS (PostgREST)\n");
  {
    const anonHeaders = { apikey: ANON, Authorization: `Bearer ${ANON}`, "content-type": "application/json" };
    if (!ANON) {
      check("RLS: anonim kalit bilan shaxsiy jadvallar yopiq", false, "SUPABASE_ANON_KEY berilmagan — test o'tkazib yuborildi");
    } else {
      for (const table of ["contact_submissions", "admin_audit_logs", "admin_users", "media_assets", "admin_roles", "news_articles", "site_settings"]) {
        const r = await fetch(`${SUPA}/rest/v1/${table}?select=*&limit=1`, { headers: anonHeaders });
        const body = await r.json().catch(() => null);
        const rows = Array.isArray(body) ? body.length : -1;
        check(`RLS: ${table} anonim uchun bo'sh/yopiq`, r.status === 401 || rows === 0, `HTTP ${r.status}, ${rows} qator`);
      }

      // Haqiqiy (non-admin) foydalanuvchi JWT'si bilan:
      const session = await goTrueSignIn(P.plain, PW.plain);
      if (session?.access_token) {
        const userHeaders = { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" };
        const own = await fetch(`${SUPA}/rest/v1/admin_users?select=user_id,is_active&limit=10`, { headers: userHeaders });
        const ownRows = await own.json().catch(() => null);
        // Non-admin: admin_users yozuvi yo'q → 0 qator (self-select siyosati boshqalarni ko'rsatmaydi).
        check("RLS: non-admin faqat O'Z admin_users yozuvini ko'radi (bu yerda 0)", own.status === 200 && Array.isArray(ownRows) && ownRows.length === 0, `HTTP ${own.status}, ${Array.isArray(ownRows) ? ownRows.length : "?"} qator`);

        const rolesAsUser = await fetch(`${SUPA}/rest/v1/admin_roles?select=role&limit=10`, { headers: userHeaders });
        const rolesRows = await rolesAsUser.json().catch(() => null);
        check("RLS: non-admin admin_roles katalogini ko'rmaydi", rolesAsUser.status === 200 && Array.isArray(rolesRows) && rolesRows.length === 0, `HTTP ${rolesAsUser.status}`);

        const subs = await fetch(`${SUPA}/rest/v1/contact_submissions?select=*&limit=1`, { headers: userHeaders });
        const subsRows = await subs.json().catch(() => null);
        check("RLS: contact_submissions authenticated uchun ham yopiq", subs.status === 401 || (Array.isArray(subsRows) && subsRows.length === 0));
      } else {
        check("RLS: authenticated foydalanuvchi siyosatlari", false, "GoTrue sign-in muvaffaqiyatsiz");
      }
    }
  }

  /* ============ 6) tezlik ============ */
  console.log("\n── Tezlik (30 so'rov, ms)\n");
  for (const p of ["/api/v1/news", "/api/v1/team"]) {
    const t = [];
    for (let i = 0; i < 30; i++) {
      const s = performance.now();
      await fetch(`${BASE}${p}`);
      t.push(performance.now() - s);
    }
    t.sort((a, b) => a - b);
    const med = Math.round(t[15]);
    check(`p50 ${p}`, med < 800, `birinchi ${Math.round(t[0])}ms · median ${med}ms · maks ${Math.round(t[29])}ms`);
  }
} catch (err) {
  check("kutilmagan xato", false, err instanceof Error ? err.message : String(err));
} finally {
  // ---- cleanup: auth foydalanuvchilari (admin_users cascade bilan o'chadi) ----
  for (const id of created.authUsers) await deleteAuthUser(id);
  for (const id of created.adminRows) await rest("admin_users", { method: "DELETE", qs: `id=eq.${id}` }).catch(() => {});
  await cleanupSmokeRows("yugurish yakunida ").catch(() => {});
  if (server) {
    server.removeAllListeners();
    server.stdout.destroy();
    server.stderr.destroy();
    server.kill("SIGTERM");
    setTimeout(() => {
      if (!server.killed) server.kill("SIGKILL");
      server.unref();
    }, 1500);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n═══════ NATIJA: ${results.length - failed.length}/${results.length} tekshiruv o'tdi ═══════`);
if (failed.length) {
  console.log("O'tmaganlar:");
  for (const f of failed) {
    console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
    if (process.env.GITHUB_ACTIONS === "true") console.log(`::error::FAIL: ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  }
  exitCode = 1;
}
process.exit(exitCode);
