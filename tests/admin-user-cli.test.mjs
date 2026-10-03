/**
 * Phase 4 — `scripts/admin-user.mjs` CLI tests (node:test).
 *
 * The bootstrap tool runs with the service-role key, i.e. with dashboard-level
 * power, and the operator runs it against PRODUCTION. That combination must not
 * rest on a manual check, so it is exercised here against a local fake that
 * speaks both APIs it uses (GoTrue admin + PostgREST).
 *
 * What is asserted, in order of how much it matters:
 *   - `link` writes exactly one `admin_users` row and issues NO DELETE anywhere
 *     (the operator's "do not delete existing users / unrelated records" rule);
 *   - `link` is idempotent: an already-correct grant is reported, not rewritten;
 *   - `create` against an e-mail that already exists stops and points at `link`
 *     instead of touching the Auth record;
 *   - no key material or password ever reaches stdout/stderr.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/admin-user.mjs", import.meta.url));
const PORT = 3211;
const BASE = `http://127.0.0.1:${PORT}`;
const FAKE_KEY = "fake-service-role-key-never-print";
const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "99999999-9999-4999-8999-999999999999";

/** Mutable per-test scenario, so one server covers every case. */
function makeState() {
  return {
    authUsers: [{ id: ADMIN_ID, email: "director@202-maktab.uz" }],
    adminRows: [],
    createAuthStatus: 422,
    createAuthBody: { error_code: "UserAlreadyExists", error_msg: "User already exists" },
    requests: [], // { method, path, body }
  };
}

function startFake(state) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, BASE);
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    const body = raw ? JSON.parse(raw) : null;
    state.requests.push({ method: req.method, path: url.pathname + url.search, body });

    const json = (code, data) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(data));
    };

    // --- PostgREST (admin_roles / admin_users) ---
    if (url.pathname === "/rest/v1/admin_roles") return json(200, [{ role: "admin" }]);

    if (url.pathname === "/rest/v1/admin_users" && req.method === "GET") {
      const want = url.searchParams.get("user_id");
      const rows = want ? state.adminRows.filter((r) => `eq.${r.user_id}` === want) : state.adminRows;
      return json(200, rows);
    }
    if (url.pathname === "/rest/v1/admin_users" && req.method === "POST") {
      state.adminRows.push({ id: "row-1", ...body });
      return json(201, [{ id: "row-1", ...body }]);
    }

    // --- GoTrue admin API ---
    if (url.pathname === "/auth/v1/admin/users" && req.method === "GET") return json(200, { users: state.authUsers });
    if (url.pathname.startsWith("/auth/v1/admin/users/") && req.method === "GET") {
      const id = url.pathname.split("/").pop();
      const user = state.authUsers.find((u) => u.id === id);
      return user ? json(200, user) : json(404, { error: "not_found" });
    }
    if (url.pathname === "/auth/v1/admin/users" && req.method === "POST") {
      if (state.createAuthStatus === 200) {
        const created = { id: OTHER_ID, email: body.email };
        state.authUsers.push(created);
        return json(200, created);
      }
      return json(state.createAuthStatus, state.createAuthBody);
    }

    return json(404, { error: "unhandled", path: url.pathname });
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

/** Runs the CLI. stdin is a pipe so `create`'s password prompt cannot hang. */
function run(args, { stdin = "" } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, SUPABASE_URL: BASE, SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    if (stdin) child.stdin.write(stdin);
    child.stdin.end();
    child.on("close", (code) => resolve({ code, out, err, all: out + err }));
  });
}

/** Boots the fake for one test and tears it down afterwards. */
async function withState(fn) {
  const state = makeState();
  const server = await startFake(state);
  try {
    await fn(state);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
}

/* ============================= link ============================= */

test("link --email attaches the existing Auth user with one admin_users row", async () => {
  await withState(async (state) => {
    const r = await run(["link", "--email", "director@202-maktab.uz", "--role", "admin"]);
    assert.equal(r.code, 0, r.all);
    assert.match(r.out, /Auth foydalanuvchi adminga biriktirildi/);
    assert.ok(r.out.includes(ADMIN_ID), "prints the userId so the operator can verify it");

    const inserts = state.requests.filter((q) => q.method === "POST" && q.path.startsWith("/rest/v1/admin_users"));
    assert.equal(inserts.length, 1, "exactly one row write");
    assert.deepEqual(inserts[0].body, { user_id: ADMIN_ID, email: "director@202-maktab.uz", role: "admin", is_active: true });
  });
});

test("link is READ-ONLY towards users: no DELETE, no PATCH, no password prompt", async () => {
  await withState(async (state) => {
    const r = await run(["link", "--email", "director@202-maktab.uz"]);
    assert.equal(r.code, 0, r.all);
    const methods = new Set(state.requests.map((q) => q.method));
    assert.equal(methods.has("DELETE"), false, "link must never delete anything");
    assert.equal(methods.has("PATCH"), false, "link must never modify anything in place");
    assert.equal(methods.has("PUT"), false);
    assert.match(r.out, /hech narsa o'zgartirilmadi|Auth yozuviga tegilmadi/, "states its non-destructive scope");
    // link must not prompt: the password prompts are written to stderr by the
    // prompter, so assert on the prompt text rather than the word "parol",
    // which appears legitimately in link's own reassurance message.
    assert.equal(r.err.includes("Yangi admin paroli"), false, "link must not ask for a password");
  });
});

test("link by --user-id works without an e-mail, taking the address from Auth", async () => {
  await withState(async (state) => {
    const r = await run(["link", "--user-id", ADMIN_ID]);
    assert.equal(r.code, 0, r.all);
    const insert = state.requests.find((q) => q.method === "POST" && q.path.startsWith("/rest/v1/admin_users"));
    assert.equal(insert.body.user_id, ADMIN_ID);
    assert.equal(insert.body.email, "director@202-maktab.uz", "lower-cased address resolved from GoTrue");
  });
});

test("link is idempotent: a correct existing grant is reported, not rewritten", async () => {
  await withState(async (state) => {
    state.adminRows.push({ id: "row-0", user_id: ADMIN_ID, email: "director@202-maktab.uz", role: "admin", is_active: true });
    const before = state.requests.length;
    const r = await run(["link", "--email", "director@202-maktab.uz"]);
    assert.equal(r.code, 0, r.all);
    assert.match(r.out, /Hech narsa o'zgartirilmadi/);
    const writes = state.requests.slice(before).filter((q) => q.method !== "GET");
    assert.equal(writes.length, 0, `no write should have been issued, got ${JSON.stringify(writes.map((w) => w.method))}`);
  });
});

test("link reports a missing Auth user and points at create (it does not invent one)", async () => {
  await withState(async () => {
    const r = await run(["link", "--email", "yoq@202-maktab.uz"]);
    assert.equal(r.code, 1);
    assert.match(r.err, /Auth'da topilmadi/);
    assert.match(r.err, /admin-user\.mjs create --email yoq@202-maktab\.uz/);
  });
});

test("link validates input before touching the network", async () => {
  await withState(async (state) => {
    for (const args of [["link"], ["link", "--user-id", "11111111"], ["link", "--email", "not-an-email"]]) {
      const r = await run(args);
      assert.equal(r.code, 1, `${args.join(" ")} must fail`);
    }
    assert.equal(state.requests.length, 0, "no request may be issued for malformed input");
  });
});

/* ====================== create + already-exists ====================== */

test("create against an existing e-mail stops and redirects to link", async () => {
  await withState(async (state) => {
    const r = await run(["create", "--email", "director@202-maktab.uz", "--role", "admin"], {
      stdin: "Sup3r-Secret-Pass!\nSup3r-Secret-Pass!\n",
    });
    assert.equal(r.code, 1, "must not pretend success");
    assert.match(r.all, /allaqachon mavjud/);
    assert.match(r.all, /admin-user\.mjs link --email director@202-maktab\.uz --role admin/, "actionable next step");
    const writes = state.requests.filter((q) => q.method === "POST" && q.path.startsWith("/rest/v1/admin_users"));
    assert.equal(writes.length, 0, "no admin_users row may be created for a user we did not verify");
    assert.equal(state.adminRows.length, 0, "Auth user untouched, no row added");
  });
});

test("create for a new e-mail still does the full two-step job", async () => {
  await withState(async (state) => {
    state.createAuthStatus = 200;
    const r = await run(["create", "--email", "yangi@202-maktab.uz"], {
      stdin: "Sup3r-Secret-Pass!\nSup3r-Secret-Pass!\n",
    });
    assert.equal(r.code, 0, r.all);
    assert.match(r.out, /Admin yaratildi/);
    const auth = state.requests.find((q) => q.method === "POST" && q.path === "/auth/v1/admin/users");
    assert.equal(auth.body.email_confirm, true, "a bootstrap admin must not be stuck on e-mail confirmation");
    assert.ok(auth.body.password.length >= 8, "password forwarded to GoTrue");
    const insert = state.requests.find((q) => q.method === "POST" && q.path.startsWith("/rest/v1/admin_users"));
    assert.equal(insert.body.user_id, OTHER_ID);
  });
});

test("create rejects a mismatched or short password without calling the API", async () => {
  await withState(async (state) => {
    const short = await run(["create", "--email", "a@b.uz"], { stdin: "abc\nabc\n" });
    assert.equal(short.code, 1);
    assert.match(short.err, /kamida 8 belgi/);
    const mismatch = await run(["create", "--email", "a@b.uz"], { stdin: "long-enough-1\nlong-enough-2\n" });
    assert.equal(mismatch.code, 1);
    assert.match(mismatch.err, /Parollar mos kelmadi/);
    assert.equal(state.requests.filter((q) => q.method !== "GET").length, 0, "no write after a rejected password");
  });
});

/* ===================== the non-interactive regression ===================== */

test("create works with PIPED stdin — it must not print prompts and then do nothing", async () => {
  await withState(async (state) => {
    state.createAuthStatus = 200;
    const r = await run(["create", "--email", "pipetest@202-maktab.uz"], {
      stdin: "Piped-Pass-123\nPiped-Pass-123\n",
    });
    assert.equal(r.code, 0, `exit ${r.code}: ${r.all}`);
    const authPost = state.requests.find((q) => q.method === "POST" && q.path === "/auth/v1/admin/users");
    assert.ok(authPost, "GoTrue must actually be called");
    assert.equal(authPost.body.password, "Piped-Pass-123", "both piped lines must reach the API call, not be dropped");
    assert.ok(state.requests.some((q) => q.method === "POST" && q.path.startsWith("/rest/v1/admin_users")));
  });
});

test("a truncated pipe fails loudly instead of hanging or exiting clean", async () => {
  await withState(async (state) => {
    const r = await run(["create", "--email", "trunc@202-maktab.uz"], { stdin: "Only-One-Line\n" });
    assert.equal(r.code, 1, "must not exit 0 having done nothing");
    assert.match(r.err, /parol o'qilmadi|Parollar mos kelmadi/);
    assert.equal(state.requests.filter((q) => q.method === "POST").length, 0, "no partial write on a truncated prompt");
  });
});

/* ========================== secret hygiene ========================== */

test("no key material or password appears in any output", async () => {
  await withState(async () => {
    const runs = await Promise.all([
      run(["link", "--email", "director@202-maktab.uz"]),
      run(["link", "--email", "yoq@202-maktab.uz"]),
      run(["create", "--email", "director@202-maktab.uz"], { stdin: "Sup3r-Secret-Pass!\nSup3r-Secret-Pass!\n" }),
      run([]),
    ]);
    for (const r of runs) {
      assert.equal(r.all.includes(FAKE_KEY), false, "service-role key must never be printed");
      assert.equal(r.all.includes("Sup3r-Secret-Pass!"), false, "password must never be echoed");
      assert.equal(r.all.includes("Bearer"), false, "no auth header echoed");
    }
  });
});

test("list masks the local part of every address", async () => {
  await withState(async (state) => {
    state.adminRows.push({ id: "row-1", user_id: ADMIN_ID, email: "director@202-maktab.uz", role: "admin", is_active: true });
    const r = await run(["list"]);
    assert.equal(r.code, 0, r.all);
    assert.equal(r.out.includes("director@"), false, "the full address must not be printed");
    assert.match(r.out, /di\*\*\*@202-maktab\.uz/);
  });
});

/* ============================ help path ============================ */

test("usage is readable without credentials (so docs do not push keys into shells)", async () => {
  const child = await new Promise((resolve) => {
    const c = spawn(process.execPath, [SCRIPT, "--help"], { env: { ...process.env, SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    c.stdout.on("data", (d) => (out += d));
    c.on("close", (code) => resolve({ code, out }));
  });
  assert.equal(child.code, 0);
  assert.match(child.out, /link\s+—/);
  assert.match(child.out, /hech qachon chop etilmaydi/);
});

test("a real command still refuses to run without the service-role key", async () => {
  const child = await new Promise((resolve) => {
    const c = spawn(process.execPath, [SCRIPT, "link", "--email", "x@y.uz"], {
      env: { ...process.env, SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let err = "";
    c.stderr.on("data", (d) => (err += d));
    c.on("close", (code) => resolve({ code, err }));
  });
  assert.equal(child.code, 1);
  assert.match(child.err, /SUPABASE_SERVICE_ROLE_KEY/);
});
