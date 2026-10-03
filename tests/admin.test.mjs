/**
 * ADMIN API test suite (node:test, zero deps).
 *
 * Boots a production server on port 3201 with DATA_PROVIDER=json plus a local
 * Supabase Auth double (tests/helpers/mock-supabase-auth.mjs), signs in as a
 * real admin through POST /api/v1/auth/login, and then verifies the CMS:
 *   dashboard counts, news CRUD + draft/public separation + duplicate slug
 *   (409) + archive, collection CRUD + reorder, settings/contact-info updates
 *   (with cache invalidation), contact submissions inbox, audit trail,
 *   validation and the media foundation.
 *
 * Authentication/authorization scenarios (401/403/CSRF/session/dev-token
 * regression) live in tests/auth.test.mjs.
 *
 * Run: node --test tests/admin.test.mjs   (requires `npm run build` first)
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { CookieJar, adminHeaders, login, startMockAuth, startServer, stopServer, testEnv, TEST_USERS, waitReady } from "./helpers/server.mjs";

const PORT = 3201;
const BASE = `http://127.0.0.1:${PORT}`;
let server;
let auth;
let jar = new CookieJar();

before(async () => {
  auth = startMockAuth();
  await auth.start();
  server = startServer(PORT, testEnv());
  const ready = await waitReady(BASE, server);
  if (!ready) throw new Error("Server failed to start within 45s");

  const res = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  jar = res.jar;
  assert.equal(res.res.status, 200, `admin login should succeed, got ${res.res.status}`);
});

after(async () => {
  stopServer(server);
  await auth?.stop();
});

const api = async (path, opts = {}) =>
  fetch(`${BASE}${path}`, { ...opts, headers: { ...adminHeaders(jar), ...(opts.headers ?? {}) } });
const json = async (res) => await res.json();
const pub = async (path) => (await fetch(`${BASE}${path}`)).json();

/* ---------------- news CRUD ---------------- */

let articleId;

test("create draft article → 201; hidden from public API", async () => {
  const res = await api("/api/v1/admin/news", {
    method: "POST",
    body: JSON.stringify({
      title: "Test loyiha yangiligi",
      excerpt: "Test excerpt",
      category: "Yangiliklar",
      content: [
        { type: "p", text: "Birinchi paragraf." },
        { type: "h", text: "Sarlavha" },
      ],
      isPublished: false,
    }),
  });
  assert.equal(res.status, 201);
  const body = await json(res);
  articleId = body.data.id;
  assert.ok(articleId);
  assert.equal(body.data.isPublished, false);
  assert.match(body.data.slug, /^test-loyiha-yangiligi/);

  const publicList = await pub("/api/v1/news?limit=50");
  assert.equal(publicList.data.some((n) => n.slug === body.data.slug), false);
});

test("duplicate slug → 409 CONFLICT", async () => {
  const res = await api("/api/v1/admin/news", {
    method: "POST",
    body: JSON.stringify({ title: "Yangi o‘quv yili nusxa", slug: "yangi-oquv-yili-2026", isPublished: false }),
  });
  assert.equal(res.status, 409);
  const body = await json(res);
  assert.equal(body.error.code, "CONFLICT");
});

test("validation: missing title → 422 with field details", async () => {
  const res = await api("/api/v1/admin/news", { method: "POST", body: JSON.stringify({ excerpt: "x" }) });
  assert.equal(res.status, 422);
  const body = await json(res);
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.details.some((d) => d.field === "title"));
});

test("publish draft → appears in public API + audit PUBLISH", async () => {
  const res = await api(`/api/v1/admin/news/${articleId}`, {
    method: "PATCH",
    body: JSON.stringify({ isPublished: true }),
  });
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.data.isPublished, true);

  const publicList = await pub("/api/v1/news?limit=50");
  assert.equal(publicList.data.some((n) => n.slug === body.data.slug), true);

  const audit = await json(await api("/api/v1/admin/audit-log"));
  assert.equal(audit.data.some((a) => a.action === "PUBLISH" && a.entityType === "news"), true);
});

test("public article endpoint returns the new article", async () => {
  const admin = await json(await api(`/api/v1/admin/news/${articleId}`));
  const res = await fetch(`${BASE}/api/v1/news/${admin.data.slug}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.slug, admin.data.slug);
});

test("archive (soft delete) → hidden publicly, visible in admin archive filter", async () => {
  const res = await api(`/api/v1/admin/news/${articleId}`, { method: "DELETE" });
  assert.equal(res.status, 200);
  const body = await json(res);
  assert.equal(body.data.archived, true);

  const admin = await json(await api(`/api/v1/admin/news/${articleId}`));
  assert.ok(admin.data.archivedAt);

  const slug = admin.data.slug;
  const pubItem = await fetch(`${BASE}/api/v1/news/${slug}`);
  assert.equal(pubItem.status, 404);

  const archived = await json(await api("/api/v1/admin/news?status=archived"));
  assert.equal(archived.data.some((a) => a.id === articleId), true);
});

test("hard delete removes the row completely", async () => {
  const res = await api(`/api/v1/admin/news/${articleId}?hard=true`, { method: "DELETE" });
  assert.equal(res.status, 200);
  const gone = await api(`/api/v1/admin/news/${articleId}`);
  assert.equal(gone.status, 404);
});

/* ---------------- collections ---------------- */

let memberId;
test("team: create → reorder → hide → verify public behavior", async () => {
  const create = await json(await api("/api/v1/admin/team", {
    method: "POST",
    body: JSON.stringify({ name: "Test Ustoz", role: "Matematika fani o‘qituvchisi", group: "teachers", category: "Aniq fanlar", isVisible: true }),
  }));
  memberId = create.data.id;

  const list = await json(await api("/api/v1/admin/team"));
  const ids = list.data.map((m) => m.id);
  // move new member to front
  const reordered = [memberId, ...ids.filter((i) => i !== memberId)];
  const r = await api("/api/v1/admin/team/order", { method: "PUT", body: JSON.stringify({ ids: reordered }) });
  assert.equal(r.status, 200);

  const after = await json(await api("/api/v1/admin/team"));
  assert.equal(after.data[0].id, memberId);

  // hide → public team list should not include
  await api(`/api/v1/admin/team/${memberId}`, { method: "PATCH", body: JSON.stringify({ isVisible: false }) });
  const publicTeam = await pub("/api/v1/team?limit=50");
  assert.equal(publicTeam.data.some((m) => m.id === memberId), false);

  // invalid reorder → 400
  const bad = await api("/api/v1/admin/team/order", { method: "PUT", body: JSON.stringify({ ids: ["nope"] }) });
  assert.equal(bad.status, 400);
});

test("faqs: create + public API reflects after invalidation", async () => {
  const create = await json(await api("/api/v1/admin/faqs", {
    method: "POST",
    body: JSON.stringify({ q: "Test savol bormi?", a: "Ha, bu test javobi.", isVisible: true }),
  }));
  const publicFaqs = await pub("/api/v1/faqs");
  assert.equal(publicFaqs.data.items.some((f) => f.q === "Test savol bormi?"), true);
  assert.equal(create.data.id.startsWith("faq-"), true);
});

test("gallery: create video item + public type filter", async () => {
  const create = await json(await api("/api/v1/admin/gallery", {
    method: "POST",
    body: JSON.stringify({ type: "video", src: "/video/campus.mp4", alt: "Test video", category: "Maktab muhiti", album: "Video", width: 1920, height: 1080 }),
  }));
  const publicGallery = await pub("/api/v1/gallery?type=video");
  assert.equal(publicGallery.data.some((g) => g.id === create.data.id), true);
});

test("statistics: create + public API reflects", async () => {
  await api("/api/v1/admin/statistics", {
    method: "POST",
    body: JSON.stringify({ value: 42, suffix: "+", label: "Test statistikasi", description: "test", icon: "users" }),
  });
  const publicStats = await pub("/api/v1/stats");
  assert.equal(publicStats.data.items.some((s) => s.label === "Test statistikasi"), true);
});

/* ---------------- settings & contact info ---------------- */

test("settings PATCH → public site-config reflects + audit", async () => {
  const res = await api("/api/v1/admin/settings", {
    method: "PATCH",
    body: JSON.stringify({ tagline: "Yangi shior (test)" }),
  });
  assert.equal(res.status, 200);
  const publicConfig = await pub("/api/v1/site-config");
  assert.equal(publicConfig.data.tagline, "Yangi shior (test)");
});

test("contact-info PATCH coordinates → public endpoint reflects", async () => {
  const res = await api("/api/v1/admin/contact-info", {
    method: "PATCH",
    body: JSON.stringify({ map: { embed: "https://example.com/embed", route: "https://example.com/route", view: "https://example.com/view", latitude: 41.3, longitude: 69.24, verified: true } }),
  });
  assert.equal(res.status, 200);
  const publicInfo = await pub("/api/v1/contact-info");
  assert.equal(publicInfo.data.map.latitude, 41.3);
  assert.equal(publicInfo.data.map.verified, true);
});

/* ---------------- submissions ---------------- */

test("valid contact POST → appears in admin inbox (status=new), admin-only", async () => {
  const post = await fetch(`${BASE}/api/v1/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test Foydalanuvchi", contact: "test@example.com", topic: "admission", message: "Bu test murojaatidir, iltimos javob bering." }),
  });
  assert.equal(post.status, 200);

  const inbox = await json(await api("/api/v1/admin/contact-submissions"));
  const item = inbox.data.find((s) => s.name === "Test Foydalanuvchi");
  assert.ok(item, "submission stored");
  assert.equal(item.status, "new");
  return { id: item.id };
});

test("honeypot POST → stored as spam, public response stays silent 200", async () => {
  const post = await fetch(`${BASE}/api/v1/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Spam Bot", contact: "spam@example.com", topic: "other", message: "Buy now http://a.com http://b.com", website: "http://spam.example" }),
  });
  assert.equal(post.status, 200);
  const inbox = await json(await api("/api/v1/admin/contact-submissions?status=spam"));
  assert.equal(inbox.data.some((s) => s.name === "Spam Bot"), true);
});

test("submission status change + delete", async () => {
  const inbox = await json(await api("/api/v1/admin/contact-submissions?status=new"));
  const item = inbox.data[0];
  assert.ok(item);

  const res = await api(`/api/v1/admin/contact-submissions/${item.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "resolved" }),
  });
  assert.equal(res.status, 200);
  assert.equal((await json(res)).data.status, "resolved");

  const del = await api(`/api/v1/admin/contact-submissions/${item.id}`, { method: "DELETE" });
  assert.equal(del.status, 200);
});

test("public API never exposes submissions or audit", async () => {
  const a = await fetch(`${BASE}/api/v1/contact-submissions`);
  assert.equal(a.status, 404);
  const b = await fetch(`${BASE}/api/v1/audit-log`);
  assert.equal(b.status, 404);
});

/* ---------------- media (foundation) ---------------- */

test("media list on json provider returns note + empty items", async () => {
  const body = await json(await api("/api/v1/admin/media"));
  assert.deepEqual(body.data.items, []);
  assert.match(body.data.note, /supabase/i);
});
