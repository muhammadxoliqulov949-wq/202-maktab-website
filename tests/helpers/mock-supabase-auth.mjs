/**
 * TEST-ONLY Supabase Auth (GoTrue) double.
 *
 * Phase 4 delegates credential verification to Supabase Auth, so the local
 * test suite (`DATA_PROVIDER=json`, no cloud project) needs something that
 * speaks the GoTrue HTTP protocol. This file lives in `tests/` only — it is not
 * part of the application, is never bundled by Next, and cannot be reached in
 * production.
 *
 * Implemented surface (exactly what @supabase/supabase-js uses):
 *   POST /auth/v1/token?grant_type=password
 *   POST /auth/v1/token?grant_type=refresh_token
 *   GET  /auth/v1/user
 *   POST /auth/v1/logout
 *   POST /__test/revoke           (test helper: invalidate a user's tokens)
 *
 * It signs nothing: the "tokens" are opaque ids the server keeps in a map, and
 * the app under test always verifies them by calling `/auth/v1/user` — exactly
 * as it does against the real GoTrue.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

export function createMockSupabaseAuth({ users, port }) {
  /** @type {Map<string, {userId:string, revoked:boolean}>} */
  const accessTokens = new Map();
  /** @type {Map<string, {userId:string, revoked:boolean}>} */
  const refreshTokens = new Map();

  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  function publicUser(u) {
    return {
      id: u.id,
      aud: "authenticated",
      role: "authenticated",
      email: u.email,
      email_confirmed_at: new Date().toISOString(),
      phone: "",
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
    };
  }

  function issue(userId, email, expiresIn = 3600) {
    const access = `at_${randomUUID()}`;
    const refresh = `rt_${randomUUID()}`;
    accessTokens.set(access, { userId, revoked: false, expiresAt: Date.now() + expiresIn * 1000 });
    refreshTokens.set(refresh, { userId, revoked: false });
    return {
      access_token: access,
      token_type: "bearer",
      expires_in: expiresIn,
      refresh_token: refresh,
      user: publicUser(byEmail.get(email.toLowerCase()) ?? users.find((u) => u.id === userId)),
    };
  }

  function json(res, status, body) {
    const text = JSON.stringify(body);
    res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
    res.end(text);
  }

  async function readBody(req) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    try {
      if (path === "/auth/v1/token" && req.method === "POST") {
        const body = await readBody(req);
        if (url.searchParams.get("grant_type") === "refresh_token") {
          const entry = refreshTokens.get(body.refresh_token ?? "");
          if (!entry || entry.revoked) {
            return json(res, 400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
          }
          // Rotate, like the real GoTrue.
          entry.revoked = true;
          const user = users.find((u) => u.id === entry.userId);
          return json(res, 200, issue(entry.userId, user.email));
        }

        // password grant
        const email = String(body.email ?? "").toLowerCase();
        const user = byEmail.get(email);
        if (!user || user.password !== body.password) {
          return json(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
        }
        return json(res, 200, issue(user.id, user.email, user.expiresIn ?? 3600));
      }

      if (path === "/auth/v1/user" && req.method === "GET") {
        const header = req.headers.authorization ?? "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        const entry = accessTokens.get(token);
        if (!entry || entry.revoked) {
          return json(res, 403, { msg: "invalid JWT" });
        }
        if (entry.expiresAt <= Date.now()) {
          // Forces @supabase/supabase-js down its refresh path, like real GoTrue.
          return json(res, 401, { error: "invalid_token", error_description: "token expired" });
        }
        const user = users.find((u) => u.id === entry.userId);
        return json(res, 200, publicUser(user));
      }

      if (path === "/auth/v1/logout" && req.method === "POST") {
        const header = req.headers.authorization ?? "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        const entry = accessTokens.get(token);
        if (entry) {
          entry.revoked = true;
          for (const [, rt] of refreshTokens) if (rt.userId === entry.userId) rt.revoked = true;
        }
        res.writeHead(204).end();
        return;
      }

      if (path === "/__test/revoke" && req.method === "POST") {
        const body = await readBody(req);
        for (const [k, v] of accessTokens) if (v.userId === body.userId) accessTokens.get(k).revoked = true;
        for (const [k, v] of refreshTokens) if (v.userId === body.userId) refreshTokens.get(k).revoked = true;
        return json(res, 200, { ok: true });
      }

      return json(res, 404, { error: "not_found", error_description: `mock has no route ${path}` });
    } catch (err) {
      return json(res, 500, { error: "server_error", error_description: String(err?.message ?? err) });
    }
  });

  return {
    server,
    start: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => resolve(port));
      }),
    stop: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

/** Shared fixture identities — must match ADMIN_USERS_SEED in the test env. */
export const TEST_USERS = {
  admin: { id: "11111111-1111-4111-8111-111111111111", email: "admin@example.test", password: "Correct-Horse-Battery-1" },
  inactive: { id: "22222222-2222-4222-8222-222222222222", email: "inactive@example.test", password: "Correct-Horse-Battery-2" },
  plain: { id: "33333333-3333-4333-8333-333333333333", email: "person@example.test", password: "Correct-Horse-Battery-3" },
  /** 1-second access token → forces the client down the refresh path. */
  shortlived: { id: "44444444-4444-4444-8444-444444444444", email: "shortlived@example.test", password: "Correct-Horse-Battery-4", expiresIn: 1 },
};

/** Value for ADMIN_USERS_SEED (json provider only — no credentials in it). */
export const ADMIN_USERS_SEED = JSON.stringify([
  { userId: TEST_USERS.admin.id, email: TEST_USERS.admin.email, role: "admin", isActive: true },
  { userId: TEST_USERS.inactive.id, email: TEST_USERS.inactive.email, role: "admin", isActive: false },
  { userId: TEST_USERS.shortlived.id, email: TEST_USERS.shortlived.email, role: "admin", isActive: true },
  // TEST_USERS.plain intentionally has NO row → "authenticated but not an admin".
]);
