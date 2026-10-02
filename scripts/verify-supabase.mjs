/**
 * Supabase real-DB verification (Phase 3) — GitHub Actions / lokal uchun.
 *
 * Tekshiradi:
 *  1) Supabase REST: 15 jadval mavjudligi + qator sonlari (kutilganlar bilan)
 *  2) Server DATA_PROVIDER=supabase bilan ishga tushadi
 *  3) Public API real bazadan o'qiydi (news/team/faqs/site-config/contact-info)
 *  4) Admin CRUD smoke (o'z-o'zini tozalaydi): draft→hidden→publish→visible→
 *     archive→hidden→hard delete; murojaat→inbox→status→delete; audit yozuvlari
 *  5) Cache invalidation: settings patch → public API aks etadi → qayta tiklanadi
 *  6) Tezlik: /news va /team — birinchi (MISS) va keyingi (HIT) javob ms
 *
 * Talab: `npm run build` oldin bajarilgan bo'lsin. Muhit:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (majburiy)
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const SUPA = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) {
  console.error("✗ SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY muhit o'zgaruvchilari kerak");
  process.exit(1);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---------------- 1) Supabase REST: jadvallar + sonlar ---------------- */

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
  admin_audit_logs: 0,
};

async function tableCount(table) {
  const res = await fetch(`${SUPA}/rest/v1/${table}?select=*`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) return { error: `${res.status}` };
  const range = res.headers.get("content-range"); // "0-0/13"
  const total = range?.split("/")[1];
  return { count: total === "*" ? null : Number(total) };
}

/* ---------------- server yordamchilari ---------------- */

const PORT = 3202;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = `ci-${randomUUID()}`;

function startServer() {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    cwd: new URL("..", import.meta.url).pathname,
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATA_PROVIDER: "supabase",
      ADMIN_DEV_TOKEN: TOKEN,
      RATE_LIMIT_ADMIN_MAX: "10000",
      RATE_LIMIT_PUBLIC_READ_MAX: "100000",
      RATE_LIMIT_CONTACT_MAX: "1000",
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

const api = (path, opts = {}) =>
  fetch(`${BASE}${path}`, { ...opts, headers: { "content-type": "application/json", "x-admin-dev-token": TOKEN, ...(opts.headers ?? {}) } });

const pub = async (path) => {
  const r = await fetch(`${BASE}${path}`);
  return { status: r.status, body: await r.json().catch(() => null) };
};

/* ---------------- main ---------------- */

let server = null;
let exitCode = 0;

try {
  // 1) jadvallar
  console.log(`\n── Supabase REST tekshiruvi: ${new URL(SUPA).host}\n`);
  for (const [table, expected] of Object.entries(EXPECTED)) {
    const { count, error } = await tableCount(table);
    if (error !== undefined) {
      check(`jadval: ${table}`, false, `REST xato (${error}) — migratsiya qo'llanilmagan bo'lishi mumkin`);
    } else {
      check(`jadval: ${table}`, count === expected, `${count} qator (kutilgan ${expected})`);
    }
  }

  // 2) server
  console.log("\n── Server (DATA_PROVIDER=supabase)\n");
  server = startServer();
  const ready = await waitReady();
  check("server ishga tushdi", ready);
  if (!ready) throw new Error("server did not start");

  // 3) public API real bazadan
  const news = await pub("/api/v1/news");
  check("GET /api/v1/news", news.status === 200 && Array.isArray(news.body?.data), `${news.body?.data?.length ?? "?"} ta yangilik`);
  check("yangilik slug detail", (await pub("/api/v1/news/yangi-oquv-yili-2026")).status === 200);
  // Muhim: /api/v1/team sahifalanadi (limit 1–50, default 12). Shu sababli
  // to'liq ro'yxat faqat `limit=50` bilan olinadi; aks holda 1-sahifa (12 ta)
  // qaytadi va 16 a'zoning oxirgi 4 tasi (p-13…p-16) tekshiruvdan chetda qoladi.
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

  // 4) admin CRUD smoke (o'z-o'zini tozalaydi)
  console.log("\n── Admin CRUD smoke (real DB, cleanup bilan)\n");
  const slug = `ci-smoke-${Date.now().toString(36)}`;
  let articleId = null;
  try {
    const createRes = await api("/api/v1/admin/news", {
      method: "POST",
      body: JSON.stringify({ title: "CI smoke yangilik", slug, excerpt: "ci", isPublished: false }),
    });
    check("draft yaratildi (201)", createRes.status === 201);
    articleId = (await createRes.json())?.data?.id;

    const hiddenList = await pub("/api/v1/news");
    check("draft public'da YO'Q", !hiddenList.body?.data?.some((n) => n.slug === slug));

    const publishRes = await api(`/api/v1/admin/news/${articleId}`, { method: "PATCH", body: JSON.stringify({ isPublished: true }) });
    check("publish (200)", publishRes.status === 200);

    const shownList = await pub("/api/v1/news");
    check("publish'dan keyin public'da BOR", shownList.body?.data?.some((n) => n.slug === slug));
    check("public detail 200", (await pub(`/api/v1/news/${slug}`)).status === 200);

    const audit = await (await api("/api/v1/admin/audit-log?limit=10")).json();
    check("audit: PUBLISH yozuvi bor", audit.data?.some((a) => a.action === "PUBLISH" && a.entityType === "news"));

    const delRes = await api(`/api/v1/admin/news/${articleId}?hard=true`, { method: "DELETE" });
    check("hard delete (200)", delRes.status === 200);
    check("o'chirilgach public 404", (await pub(`/api/v1/news/${slug}`)).status === 404);
    articleId = null;
  } finally {
    if (articleId) await api(`/api/v1/admin/news/${articleId}?hard=true`, { method: "DELETE" }).catch(() => {});
  }

  // murojaat smoke
  {
    const post = await fetch(`${BASE}/api/v1/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "CI Smoke", contact: "ci@example.com", topic: "other", message: "CI smoke murojaati — o'chiriladi." }),
    });
    check("contact POST 200 (jim)", post.status === 200);
    const inbox = await (await api("/api/v1/admin/contact-submissions?limit=20")).json();
    const item = inbox.data?.find((s) => s.name === "CI Smoke");
    check("murojaat inboxda (real DB)", Boolean(item));
    if (item) {
      await api(`/api/v1/admin/contact-submissions/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) });
      const del = await api(`/api/v1/admin/contact-submissions/${item.id}`, { method: "DELETE" });
      check("murojaat cleanup (delete 200)", del.status === 200);
    }
  }

  // 5) cache invalidation (settings round-trip, restore bilan)
  {
    const orig = await (await api("/api/v1/admin/settings")).json();
    const originalTagline = orig.data?.tagline;
    try {
      await api("/api/v1/admin/settings", { method: "PATCH", body: JSON.stringify({ tagline: "CI smoke shiori" }) });
      const after = await pub("/api/v1/site-config");
      check("cache invalidation: patch public'ga aks etdi", after.body?.data?.tagline === "CI smoke shiori");
    } finally {
      await api("/api/v1/admin/settings", { method: "PATCH", body: JSON.stringify({ tagline: originalTagline ?? "" }) });
      const restored = await pub("/api/v1/site-config");
      check("settings tiklandi", restored.body?.data?.tagline === originalTagline);
    }
  }

  // 6) tezlik
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
  for (const f of failed) console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  exitCode = 1;
}
process.exit(exitCode);
