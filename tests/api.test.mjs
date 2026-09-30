/**
 * Phase 2 API test suite — focused integration tests (node:test, zero deps).
 * Boots a production server on port 3199 with test-friendly limits and
 * verifies: contract, validation, pagination, search, caching, rate limiting,
 * error sanitization, security headers.
 *
 * Run: node tests/api.test.mjs   (builds are expected: `npm run build` first)
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

async function startServer() {
  // spawn the Next binary directly (no npx wrapper) so SIGTERM reaches the server
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    cwd: new URL("..", import.meta.url).pathname,
    env: {
      ...process.env,
      NODE_ENV: "production",
      API_DOCS_ENABLED: "true",
      METRICS_ENABLED: "true",
      RATE_LIMIT_CONTACT_MAX: "3",
      RATE_LIMIT_CONTACT_WINDOW_MS: "60000",
      RATE_LIMIT_SEARCH_MAX: "1000",
      RATE_LIMIT_PUBLIC_READ_MAX: "100000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => process.stdout.write(`[srv] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[srv!] ${d}`));

  // wait for readiness
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/v1/health`);
      if (res.ok) return child;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  child.kill("SIGKILL");
  throw new Error("Server failed to start within 30s");
}

before(async () => {
  server = await startServer();
});

after(() => {
  if (server) {
    server.removeAllListeners();
    server.stdout.destroy();
    server.stderr.destroy();
    server.kill("SIGTERM");
    // hard fallback so node:test can exit even if the child lingers
    setTimeout(() => server?.kill("SIGKILL"), 1500).unref();
  }
});

const get = (path, headers = {}) => fetch(`${BASE}${path}`, { headers });

test("health: contract + small body", async () => {
  const res = await get("/api/v1/health");
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.status, "ok");
  assert.ok("meta" in json);
});

test("news list: envelope + pagination meta", async () => {
  const res = await get("/api/v1/news?limit=2&page=1");
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.length, 2);
  assert.equal(json.meta.page, 1);
  assert.equal(json.meta.limit, 2);
  assert.equal(json.meta.total, 6);
  assert.equal(json.meta.totalPages, 3);
});

test("news list: page 2 differs from page 1", async () => {
  const p1 = await (await get("/api/v1/news?limit=2&page=1")).json();
  const p2 = await (await get("/api/v1/news?limit=2&page=2")).json();
  assert.notEqual(p1.data[0].slug, p2.data[0].slug);
  assert.equal(p2.meta.page, 2);
});

test("news list: invalid limit rejected (massive page size protection)", async () => {
  const res = await get("/api/v1/news?limit=999");
  assert.equal(res.status, 422);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.equal(json.error.code, "VALIDATION_ERROR");
  assert.ok(json.error.details.some((d) => d.field === "limit"));
});

test("news list: invalid category rejected", async () => {
  const res = await get("/api/v1/news?category=NotExisting");
  assert.equal(res.status, 422);
});

test("news list: search narrows results", async () => {
  const json = await (await get("/api/v1/news?search=spartakiada")).json();
  assert.equal(json.meta.total, 1);
  assert.equal(json.data[0].slug, "maktab-spogatki-yakuni");
});

test("news list: category + sort asc", async () => {
  const json = await (await get("/api/v1/news?category=Sport&sort=date-asc")).json();
  assert.equal(json.meta.total, 1);
});

test("news by slug: 200 + cache headers", async () => {
  const res = await get("/api/v1/news/yangi-oquv-yili-2026");
  assert.equal(res.status, 200);
  assert.ok(res.headers.get("etag"));
  assert.match(res.headers.get("cache-control"), /s-maxage=900/);
  const json = await res.json();
  assert.equal(json.data.slug, "yangi-oquv-yili-2026");
});

test("news by slug: clean 404 contract for unknown slug", async () => {
  const res = await get("/api/v1/news/mavjud-emas-slug");
  assert.equal(res.status, 404);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.equal(json.error.code, "NOT_FOUND");
  assert.equal(json.error.message, "News article not found");
  assert.ok(!JSON.stringify(json).includes("node_modules"));
  assert.ok(!JSON.stringify(json).includes("/home/"));
});

test("team: role filter preserves six Phase 1 people total", async () => {
  const all = await (await get("/api/v1/team?limit=50")).json();
  assert.equal(all.meta.total, 16);
  const lead = await (await get("/api/v1/team?role=leadership")).json();
  assert.equal(lead.meta.total, 3);
  assert.equal(lead.data[0].id, "p-01");
});

test("team: search by subject finds physics teacher", async () => {
  const json = await (await get("/api/v1/team?search=fizika")).json();
  assert.equal(json.meta.total, 1);
  assert.equal(json.data[0].name, "Sardor Nazarov");
});

test("team: byId 404 contract", async () => {
  const res = await get("/api/v1/team/p-99");
  assert.equal(res.status, 404);
  const json = await res.json();
  assert.equal(json.error.code, "NOT_FOUND");
});

test("gallery: type=video returns both videos", async () => {
  const json = await (await get("/api/v1/gallery?type=video")).json();
  assert.equal(json.meta.total, 2);
  assert.deepEqual(json.data.map((i) => i.id).sort(), ["v-01", "v-02"]);
});

test("gallery: byId 404 contract", async () => {
  const res = await get("/api/v1/gallery/g-99");
  assert.equal(res.status, 404);
});

test("faqs: existing content exposed", async () => {
  const json = await (await get("/api/v1/faqs")).json();
  assert.equal(json.data.count, 5);
  assert.equal(json.data.items.length, 5);
});

test("contact-info: map lat/lng ready for map component", async () => {
  const json = await (await get("/api/v1/contact-info")).json();
  assert.equal(typeof json.data.map.latitude, "number");
  assert.equal(typeof json.data.map.longitude, "number");
  assert.equal(json.data.map.verified, false);
});

test("cache: second request is a HIT (X-Cache header)", async () => {
  await get("/api/v1/stats");
  const res2 = await get("/api/v1/stats");
  assert.equal(res2.headers.get("x-cache"), "HIT");
});

test("http cache: ETag + 304 conditional request", async () => {
  const r1 = await get("/api/v1/faqs");
  const etag = r1.headers.get("etag");
  assert.ok(etag);
  const r2 = await get("/api/v1/faqs", { "If-None-Match": etag });
  assert.equal(r2.status, 304);
});

test("security headers present on API responses", async () => {
  const res = await get("/api/v1/health");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.ok(res.headers.get("referrer-policy"));
  assert.ok(res.headers.get("content-security-policy"));
});

test("every response carries X-Request-Id", async () => {
  const res = await get("/api/v1/health");
  assert.ok(res.headers.get("x-request-id"));
});

test("contact POST: valid submission accepted", async () => {
  const res = await fetch(`${BASE}/api/v1/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.1.0.1" },
    body: JSON.stringify({ name: "Test Foydalanuvchi", contact: "+998 90 123 45 67", message: "Bu test uchun yuborilgan murojaat xabari.", topic: "admission" }),
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.received, true);
});

test("contact POST: validation errors with field details", async () => {
  const res = await fetch(`${BASE}/api/v1/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.1.0.2" },
    body: JSON.stringify({ name: "A", contact: "salom", message: "qisqa" }),
  });
  assert.equal(res.status, 422);
  const json = await res.json();
  assert.equal(json.error.code, "VALIDATION_ERROR");
  const fields = json.error.details.map((d) => d.field);
  assert.ok(fields.includes("name"));
  assert.ok(fields.includes("contact"));
  assert.ok(fields.includes("message"));
});

test("contact POST: unexpected object structure rejected safely (no 500, no stack)", async () => {
  const res = await fetch(`${BASE}/api/v1/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.1.0.3" },
    body: JSON.stringify({ name: { deep: { nested: true } }, contact: ["x"], message: 42 }),
  });
  assert.equal(res.status, 422);
  const text = await res.text();
  assert.ok(!text.includes("at ") || !text.includes("node_modules"));
});

test("contact POST: malformed JSON → 400", async () => {
  const res = await fetch(`${BASE}/api/v1/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.1.0.4" },
    body: "{invalid",
  });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.error.code, "BAD_REQUEST");
});

test("contact POST: wrong content-type → 415", async () => {
  const res = await fetch(`${BASE}/api/v1/contact`, {
    method: "POST",
    headers: { "Content-Type": "text/plain", "X-Forwarded-For": "10.1.0.5" },
    body: "salom",
  });
  assert.equal(res.status, 415);
});

test("contact POST: oversized body → 413", async () => {
  const big = "x".repeat(20 * 1024);
  const res = await fetch(`${BASE}/api/v1/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.1.0.6" },
    body: JSON.stringify({ name: "Test", contact: "t@t.uz", message: `uzun xabar ${big}` }),
  });
  assert.equal(res.status, 413);
});

test("contact POST: rate limited after 3 (429 + Retry-After)", async () => {
  const ip = "10.2.0.9";
  const send = () =>
    fetch(`${BASE}/api/v1/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      body: JSON.stringify({ name: "Rate Test", contact: "rate@test.uz", message: "Rate limit test uchun xabar matni." }),
    });
  await send();
  await send();
  const third = await send();
  assert.equal(third.status, 200);
  const fourth = await send();
  assert.equal(fourth.status, 429);
  assert.ok(fourth.headers.get("retry-after"));
  const json = await fourth.json();
  assert.equal(json.error.code, "RATE_LIMITED");
});

test("contact GET: 405 method not allowed", async () => {
  const res = await get("/api/v1/contact");
  assert.equal(res.status, 405);
});

test("honeypot: filled website field still returns success (spam silenced)", async () => {
  const res = await fetch(`${BASE}/api/v1/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.3.0.1" },
    body: JSON.stringify({ name: "Bot Botov", contact: "bot@spam.uz", message: "Buy cheap stuff now online!", website: "http://spam.example" }),
  });
  // heuristic spam filter marks it; response is indistinguishable from success
  assert.equal(res.status, 200);
});

test("OpenAPI docs served when enabled", async () => {
  const res = await get("/api/docs");
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.openapi, "3.0.3");
  assert.ok(json.paths["/api/v1/news"]);
  assert.ok(json.paths["/api/v1/contact"].post);
});

test("metrics endpoint exposes counters when enabled", async () => {
  await get("/api/v1/news");
  const res = await get("/api/v1/metrics");
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.data.counters["http_requests_total{status=200}"] > 0);
  assert.ok(json.data.cache.hits + json.data.cache.misses > 0);
});

test("unknown API route returns 404", async () => {
  const res = await get("/api/v1/unknown-endpoint");
  assert.equal(res.status, 404);
});

test("static pages unaffected: homepage + contact still 200", async () => {
  assert.equal((await get("/")).status, 200);
  assert.equal((await get("/contact")).status, 200);
});
