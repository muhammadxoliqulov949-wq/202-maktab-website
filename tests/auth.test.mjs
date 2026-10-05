/**
 * Phase 4 AUTHENTICATION & AUTHORIZATION test suite (node:test, zero deps).
 *
 * Boots the built Next server (DATA_PROVIDER=json) on port 3203 in front of a
 * local Supabase Auth double, then exercises the real HTTP surface:
 *
 *   A. login         — success, wrong password, unknown user, validation
 *   B. /admin pages  — anonymous redirect, non-admin 403, inactive 403, admin 200
 *   C. /api/v1/admin — 401 / 403 / 403 / 200 (curl-style, cookies only)
 *   D. session       — persistence, refresh, logout invalidation, revoked denial
 *   E. audit         — real user id recorded, no password/token ever recorded
 *   F. regression    — the Phase 3 dev token no longer authenticates
 *   G. CSRF          — unsafe admin call without the double-submit token
 *   H. hygiene       — no service-role key in the client bundles
 *
 * Run: node --test tests/auth.test.mjs   (requires `npm run build` first)
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CookieJar, adminHeaders, login, startMockAuth, startServer, stopServer, testEnv, TEST_USERS, AUTH_PORT, waitReady } from "./helpers/server.mjs";

const PORT = 3203;
const BASE = `http://127.0.0.1:${PORT}`;
let server;
let auth;

before(async () => {
  auth = startMockAuth();
  await auth.start();
  server = startServer(PORT, testEnv());
  const ready = await waitReady(BASE, server);
  if (!ready) throw new Error("Server failed to start within 45s");
});

after(async () => {
  stopServer(server);
  await auth?.stop();
});

const mockControl = (path, body) =>
  fetch(`http://127.0.0.1:${AUTH_PORT}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const get = (path, headers = {}) => fetch(`${BASE}${path}`, { headers, redirect: "manual" });

/* ======================= A. LOGIN ======================= */

test("A1: valid admin login succeeds and sets session + csrf cookies", async () => {
  const { res, jar, body } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.authenticated, true);
  assert.equal(body.data.admin.email, TEST_USERS.admin.email);
  assert.equal(body.data.admin.role, "admin");
  assert.ok(Array.isArray(body.data.admin.permissions) && body.data.admin.permissions.length > 0);

  assert.ok(jar.has("m202_session"), "session cookie set");
  assert.ok(jar.has("m202_csrf"), "csrf cookie set");

  // The session cookie must be HttpOnly + SameSite=Lax; Secure in production.
  const setCookie = res.headers.getSetCookie().join("\n");
  const sessionLine = setCookie.split("\n").find((l) => l.startsWith("m202_session="));
  assert.ok(sessionLine, "Set-Cookie for m202_session present");
  assert.match(sessionLine, /httponly/i);
  assert.match(sessionLine, /samesite=lax/i);
  assert.match(sessionLine, /secure/i);
  assert.match(sessionLine, /path=\//i);

  // The CSRF cookie is readable by JS on purpose (double-submit), never HttpOnly.
  const csrfLine = setCookie.split("\n").find((l) => l.startsWith("m202_csrf="));
  assert.ok(csrfLine);
  assert.doesNotMatch(csrfLine, /httponly/i);

  // No token material in the response body.
  assert.equal(JSON.stringify(body).includes("access_token"), false);
  assert.equal(JSON.stringify(body).includes("refresh_token"), false);
});

test("A2: wrong password fails with a generic message", async () => {
  const { res, jar, body } = await login(BASE, TEST_USERS.admin.email, "definitely-not-the-password");
  assert.equal(res.status, 401);
  assert.equal(body.error.code, "UNAUTHORIZED");
  assert.equal(body.error.message, "Login failed. Please check your email and password.");
  assert.equal(jar.has("m202_session"), false, "no session cookie on failure");
});

test("A3: unknown user fails with the SAME generic message (no user enumeration)", async () => {
  const { res, body } = await login(BASE, "nobody@example.test", "whatever-12345");
  assert.equal(res.status, 401);
  assert.equal(body.error.code, "UNAUTHORIZED");
  assert.equal(body.error.message, "Login failed. Please check your email and password.");
  // No technical detail leaks.
  assert.equal(JSON.stringify(body).toLowerCase().includes("postgrest"), false);
  assert.equal(JSON.stringify(body).toLowerCase().includes("relation"), false);
});

test("A4: malformed credentials are rejected by validation (422)", async () => {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "not-an-email", password: "" }),
  });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.details.some((d) => d.field === "email"));
  assert.ok(body.error.details.some((d) => d.field === "password"));
});

test("A5: authenticated non-admin gets 403 from login (session still issued)", async () => {
  const { res, jar, body } = await login(BASE, TEST_USERS.plain.email, TEST_USERS.plain.password);
  assert.equal(res.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
  assert.equal(jar.has("m202_session"), true, "authentication succeeded, authorization did not");
});

test("A6: deactivated admin gets 403 from login", async () => {
  const { res, body } = await login(BASE, TEST_USERS.inactive.email, TEST_USERS.inactive.password);
  assert.equal(res.status, 403);
  assert.equal(body.error.code, "FORBIDDEN");
});

/* ======================= B. ADMIN PAGES ======================= */

test("B1: anonymous /admin redirects to /admin/login", async () => {
  const res = await get("/admin");
  assert.ok([301, 302, 303, 307, 308].includes(res.status), `expected a redirect, got ${res.status}`);
  assert.match(res.headers.get("location") ?? "", /^\/admin\/login/);
});

test("B2: anonymous deep admin route redirects and preserves ?next=", async () => {
  const res = await get("/admin/news");
  assert.ok([301, 302, 303, 307, 308].includes(res.status), `expected a redirect, got ${res.status}`);
  const loc = res.headers.get("location") ?? "";
  assert.match(loc, /^\/admin\/login/);
  assert.ok(loc.includes("next="), "redirect keeps the original destination");
});

test("B3: /admin/login itself is reachable without a session (no loop)", async () => {
  const res = await get("/admin/login");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Kirish/);
  assert.equal(/DEVELOPMENT ONLY/i.test(html), false, "dev banner is gone");
});

test("B4: authenticated NON-admin visiting /admin gets HTTP 403", async () => {
  const { jar } = await login(BASE, TEST_USERS.plain.email, TEST_USERS.plain.password);
  const res = await get("/admin", { cookie: jar.header() });
  assert.equal(res.status, 403);
  const html = await res.text();
  assert.match(html, /403/);
});

test("B5: authenticated INACTIVE admin visiting /admin gets HTTP 403", async () => {
  const { jar } = await login(BASE, TEST_USERS.inactive.email, TEST_USERS.inactive.password);
  const res = await get("/admin", { cookie: jar.header() });
  assert.equal(res.status, 403);
});

test("B6: active admin reaches the panel and sees their identity", async () => {
  const { jar } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  const res = await get("/admin", { cookie: jar.header() });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes(TEST_USERS.admin.email), "signed-in e-mail rendered");
  assert.match(html, /Chiqish/, "logout control rendered");
});

/* ======================= C. ADMIN API (direct curl-style) ======================= */

test("C1: admin API without a session → 401", async () => {
  const res = await get("/api/v1/admin/dashboard");
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, "UNAUTHORIZED");
});

test("C2: admin API with a bogus session cookie → 401", async () => {
  const res = await get("/api/v1/admin/dashboard", { cookie: "m202_session=not-a-real-session" });
  assert.equal(res.status, 401);
});

test("C3: admin API as an authenticated NON-admin → 403", async () => {
  const { jar } = await login(BASE, TEST_USERS.plain.email, TEST_USERS.plain.password);
  const res = await get("/api/v1/admin/dashboard", { cookie: jar.header(), "x-csrf-token": jar.get("m202_csrf") });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error.code, "FORBIDDEN");
});

test("C4: admin API as an INACTIVE admin → 403", async () => {
  const { jar } = await login(BASE, TEST_USERS.inactive.email, TEST_USERS.inactive.password);
  const res = await get("/api/v1/admin/dashboard", { cookie: jar.header(), "x-csrf-token": jar.get("m202_csrf") });
  assert.equal(res.status, 403);
});

test("C5: admin API as an ACTIVE admin → 200", async () => {
  const { jar } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  const res = await get("/api/v1/admin/dashboard", { cookie: jar.header() });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.data.counts.newsPublished > 0);
});

test("C6: private admin data is not reachable anonymously on any admin route", async () => {
  for (const p of [
    "/api/v1/admin/dashboard",
    "/api/v1/admin/news",
    "/api/v1/admin/team",
    "/api/v1/admin/contact-submissions",
    "/api/v1/admin/audit-log",
    "/api/v1/admin/settings",
    "/api/v1/admin/media",
    "/api/v1/admin/admin-users",
  ]) {
    const res = await get(p);
    assert.equal(res.status, 401, `${p} should be 401 without a session`);
  }
});

/* ======================= D. SESSION ======================= */

test("D1: session persists across requests and /auth/session reports it", async () => {
  const { jar } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  const a = await get("/api/v1/auth/session", { cookie: jar.header() });
  const b = await get("/api/v1/auth/session", { cookie: jar.header() });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  const body = await b.json();
  assert.equal(body.data.authenticated, true);
  assert.equal(body.data.admin.role, "admin");
  assert.equal(JSON.stringify(body).includes("token"), false, "no token material in the session view");
});

test("D2: /auth/session is anonymous-safe", async () => {
  const res = await get("/api/v1/auth/session");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.authenticated, false);
  assert.equal(body.data.admin, null);
});

test("D3: an expired access token is transparently refreshed", async () => {
  // This fixture user gets a 1-second access token, so the stored session is
  // already stale by the time we call the API — exactly the real-world case
  // where Supabase's refresh token must be exchanged for a new access token.
  const { jar } = await login(BASE, TEST_USERS.shortlived.email, TEST_USERS.shortlived.password);
  const before = jar.get("m202_session");
  assert.ok(before);

  await new Promise((r) => setTimeout(r, 1600));

  const res = await fetch(`${BASE}/api/v1/admin/dashboard`, { headers: { cookie: jar.header() } });
  assert.equal(res.status, 200, "request should still succeed after a refresh");

  const refreshed = new CookieJar().absorb(res);
  assert.ok(refreshed.has("m202_session"), "refreshed session cookie written back");
  assert.notEqual(refreshed.get("m202_session"), before, "the session cookie actually changed");
});

test("D4: logout clears cookies, revokes the token and invalidates access", async () => {
  const { jar } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  const okBefore = await get("/api/v1/admin/dashboard", { cookie: jar.header() });
  assert.equal(okBefore.status, 200);

  const out = await fetch(`${BASE}/api/v1/auth/logout`, {
    method: "POST",
    headers: { cookie: jar.header(), "x-csrf-token": jar.get("m202_csrf") },
  });
  assert.equal(out.status, 200);
  const cleared = new CookieJar().absorb(out);
  assert.equal(cleared.has("m202_session"), false, "session cookie cleared");
  assert.equal(cleared.has("m202_csrf"), false, "csrf cookie cleared");

  // Replaying the OLD cookie must fail: the refresh token was revoked at GoTrue.
  const after = await get("/api/v1/admin/dashboard", { cookie: jar.header() });
  assert.equal(after.status, 401, "old session must not work after logout");
});

test("D5: a revoked session is denied", async () => {
  const { jar } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  await mockControl("/__test/revoke", { userId: TEST_USERS.admin.id });
  const res = await get("/api/v1/admin/dashboard", { cookie: jar.header() });
  assert.equal(res.status, 401);
  const page = await get("/admin", { cookie: jar.header() });
  assert.ok([301, 302, 303, 307, 308].includes(page.status), "page redirects to login once the session is gone");
});

/* ======================= E. AUDIT ======================= */

test("E1: audit rows carry the real Supabase user id, never a password or token", async () => {
  const { jar } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  const H = adminHeaders(jar);

  // Produce a fresh mutation with a known marker.
  const marker = `phase4-audit-${Date.now().toString(36)}`;
  const created = await fetch(`${BASE}/api/v1/admin/news`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ title: `Phase 4 audit ${marker}`, isPublished: false }),
  });
  assert.equal(created.status, 201);
  const { data: article } = await created.json();

  const auditRes = await fetch(`${BASE}/api/v1/admin/audit-log?limit=50`, { headers: H });
  const audit = await auditRes.json();
  const rows = audit.data;

  const createRow = rows.find((r) => r.action === "CREATE" && r.entityType === "news" && r.entityId === article.id);
  assert.ok(createRow, "CREATE audit row exists");
  assert.equal(createRow.adminUserId, TEST_USERS.admin.id, "real Supabase auth user id recorded");
  assert.equal(createRow.adminEmail, TEST_USERS.admin.email);
  assert.notEqual(createRow.adminIdentifier, "dev-token", "Phase 3 mechanism label is gone");

  const loginRow = rows.find((r) => r.action === "LOGIN");
  assert.ok(loginRow, "LOGIN audit row exists");
  assert.equal(loginRow.adminUserId, TEST_USERS.admin.id);

  // Nothing sensitive anywhere in the journal.
  const blob = JSON.stringify(rows).toLowerCase();
  for (const forbidden of ["password", "access_token", "refresh_token", "service_role", "apikey"]) {
    assert.equal(blob.includes(forbidden), false, `audit log must not contain "${forbidden}"`);
  }

  await fetch(`${BASE}/api/v1/admin/news/${article.id}?hard=true`, { method: "DELETE", headers: H });
});

test("E2: failed logins are audited without the raw e-mail or the password", async () => {
  await login(BASE, "ghost@example.test", "nope-nope-nope");
  const { jar } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  const audit = await (await fetch(`${BASE}/api/v1/admin/audit-log?limit=30&action=LOGIN_FAILED`, { headers: adminHeaders(jar) })).json();
  assert.ok(audit.data.length > 0, "a LOGIN_FAILED row was written");
  const blob = JSON.stringify(audit.data).toLowerCase();
  assert.equal(blob.includes("nope-nope-nope"), false);
  assert.equal(blob.includes("ghost@example.test"), false, "raw e-mail is hashed in failure rows");
});

/* ======================= F. DEV-TOKEN REGRESSION ======================= */

test("F1: the Phase 3 dev token no longer authenticates anything", async () => {
  // Even with ADMIN_DEV_TOKEN set in the environment, the header must be inert.
  const headers = { "x-admin-dev-token": "test-admin-dev-token-1234", "x-admin-token": "test-admin-dev-token-1234" };
  for (const p of ["/api/v1/admin/dashboard", "/api/v1/admin/news", "/api/v1/admin/audit-log"]) {
    const res = await get(p, headers);
    assert.equal(res.status, 401, `${p} must be 401 with a legacy dev token`);
  }
  const page = await get("/admin", headers);
  assert.ok([301, 302, 303, 307, 308].includes(page.status), "/admin must still redirect with a legacy dev token");
});

test("F2: the source tree contains no dev-token gate", () => {
  const root = new URL("..", import.meta.url).pathname;
  const needles = ["ADMIN_DEV_TOKEN", "x-admin-dev-token", "m202-admin-dev-token", "admin-dev-token"];
  const hits = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (["node_modules", ".git", ".next", "out", "build", "coverage"].includes(entry)) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs|js|json|sql)$/.test(entry) && !/package-lock\.json$/.test(entry)) {
        const text = readFileSync(full, "utf8");
        for (const n of needles) if (text.includes(n)) hits.push(`${full.replace(root, "")}:${n}`);
      }
    }
  };
  walk(join(root, "src"));
  walk(join(root, "scripts"));
  walk(join(root, "supabase"));
  assert.deepEqual(hits, [], `dev-token remnants found: ${hits.join(", ")}`);
});

/* ======================= G. CSRF ======================= */

test("G1: an unsafe admin call without the CSRF header is rejected", async () => {
  const { jar } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  const res = await fetch(`${BASE}/api/v1/admin/news`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: jar.header() }, // no x-csrf-token
    body: JSON.stringify({ title: "CSRF probe", isPublished: false }),
  });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error.code, "CSRF_FAILED");
});

test("G2: a mismatched CSRF token is rejected", async () => {
  const { jar } = await login(BASE, TEST_USERS.admin.email, TEST_USERS.admin.password);
  const res = await fetch(`${BASE}/api/v1/admin/news`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: jar.header(), "x-csrf-token": "attacker-guess" },
    body: JSON.stringify({ title: "CSRF probe 2", isPublished: false }),
  });
  assert.equal(res.status, 403);
});

/* ======================= H. HYGIENE ======================= */

test("H1: the service-role key never appears in client bundles", () => {
  const staticDir = join(new URL("..", import.meta.url).pathname, ".next", "static");
  const needles = [process.env.SUPABASE_SERVICE_ROLE_KEY, "service_role"].filter((v) => typeof v === "string" && v.length > 8);
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(js|css)$/.test(entry)) {
        const text = readFileSync(full, "utf8");
        for (const n of needles) {
          assert.equal(text.includes(n), false, `${entry} leaks ${n === "service_role" ? 'the string "service_role"' : "the service key"}`);
        }
      }
    }
  };
  walk(staticDir);
});

/* ======================= I. PUBLIC REGRESSION ======================= */

test("I1: public API still works while auth is enforced", async () => {
  const checks = [
    ["/api/v1/news", (b) => Array.isArray(b.data) && b.data.length > 0],
    ["/api/v1/team?limit=50", (b) => Array.isArray(b.data) && b.data.length > 0],
    ["/api/v1/faqs", (b) => b.data.items.length > 0],
    ["/api/v1/site-config", (b) => Boolean(b.data.name)],
    ["/api/v1/contact-info", (b) => Boolean(b.data.address)],
  ];
  for (const [path, ok] of checks) {
    const res = await get(path);
    assert.equal(res.status, 200, `${path} → ${res.status}`);
    assert.ok(ok(await res.json()), `${path} payload unexpected`);
  }
});
