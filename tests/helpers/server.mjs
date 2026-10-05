/**
 * Shared test helpers: boot the built Next server and a mock Supabase Auth,
 * plus a tiny cookie jar so the suites can behave like a browser.
 */
import { spawn } from "node:child_process";
import { createMockSupabaseAuth, TEST_USERS, ADMIN_USERS_SEED } from "./mock-supabase-auth.mjs";

export { TEST_USERS, ADMIN_USERS_SEED };

export const AUTH_PORT = 3299;
export const SUPABASE_URL = `http://127.0.0.1:${AUTH_PORT}`;

/** Env shared by every Phase 4 test server. */
export function testEnv(extra = {}) {
  return {
    ...process.env,
    NODE_ENV: "production",
    DATA_PROVIDER: "json",
    // Auth points at the local GoTrue double; the anon key is a dummy value
    // (the double only checks that one is present).
    SUPABASE_URL,
    SUPABASE_ANON_KEY: "test-anon-key",
    ADMIN_USERS_SEED,
    RATE_LIMIT_ADMIN_MAX: "100000",
    RATE_LIMIT_PUBLIC_READ_MAX: "100000",
    RATE_LIMIT_CONTACT_MAX: "1000",
    RATE_LIMIT_LOGIN_MAX: "100000",
    ...extra,
  };
}

export function startMockAuth() {
  const mock = createMockSupabaseAuth({ users: Object.values(TEST_USERS), port: AUTH_PORT });
  return mock;
}

export function startServer(port, env) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: new URL("../..", import.meta.url).pathname,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => process.stdout.write(`[srv] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[srv!] ${d}`));
  return child;
}

export async function waitReady(base, child, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`server exited early with code ${child.exitCode}`);
    try {
      const res = await fetch(`${base}/api/v1/health`);
      if (res.ok) return true;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

export function stopServer(child) {
  if (!child) return;
  child.removeAllListeners();
  child.stdout.destroy();
  child.stderr.destroy();
  child.kill("SIGTERM");
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
    child.unref();
  }, 1500);
}

/* ---------------- cookie jar ---------------- */

export class CookieJar {
  constructor() {
    this.map = new Map();
  }

  /** Absorb Set-Cookie headers from a fetch Response. */
  absorb(res) {
    const raw = res.headers.getSetCookie?.() ?? [];
    for (const line of raw) {
      const [pair, ...attrs] = line.split(";");
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      const maxAgeZero = attrs.some((a) => /^\s*max-age=0\s*$/i.test(a)) || attrs.some((a) => /^\s*expires=Thu, 01 Jan 1970/i.test(a));
      if (maxAgeZero || value === "") this.map.delete(name);
      else this.map.set(name, value);
    }
    return this;
  }

  header() {
    return Array.from(this.map, ([k, v]) => `${k}=${v}`).join("; ");
  }

  get(name) {
    return this.map.get(name) ?? "";
  }

  has(name) {
    return this.map.has(name);
  }
}

/** Perform a login against the app and return a populated jar. */
export async function login(base, email, password) {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const jar = new CookieJar().absorb(res);
  return { res, jar, body: await res.json().catch(() => null) };
}

/** Headers for an authenticated admin API call (cookie + CSRF double-submit). */
export function adminHeaders(jar, extra = {}) {
  return {
    "content-type": "application/json",
    cookie: jar.header(),
    "x-csrf-token": jar.get("m202_csrf"),
    ...extra,
  };
}
