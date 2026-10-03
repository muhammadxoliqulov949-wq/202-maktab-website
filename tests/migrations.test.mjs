/**
 * Phase 4 — migration SQL guard tests (node:test, zero required deps).
 *
 * Why these exist: `0004_auth.sql` shipped with
 *     role text not null default 'admin' references admin_roles (role) on restrict
 * which PostgreSQL rejects (`ON RESTRICT` is not a foreign-key action; the valid
 * form is `ON DELETE RESTRICT`). It only surfaced when a human pasted the file
 * into the Supabase SQL Editor, which left the real project with a PARTIALLY
 * applied migration. Syntax like this is cheap to catch automatically, so it is
 * now a test.
 *
 * Two layers:
 *  1. structural assertions (always run, no dependencies) — invalid FK action
 *     clauses, idempotency conventions, and the Phase 4 authorization invariants.
 *  2. the real PostgreSQL grammar via pg-query-emscripten when available
 *     (`npm install --no-save pg-query-emscripten`; CI installs it explicitly).
 *     Layer 2 also runs through scripts/check-sql.mjs.
 */
import { test } from "node:test";
import { splitStatements, stripComments } from "../scripts/lib/sql.mjs";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");

const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
const read = (f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8");

/** Raw file text (used only where comments are the subject). */
const rawAll = Object.fromEntries(migrationFiles.map((f) => [f, read(f)]));
/** Comment-stripped text — what every structural assertion runs against. */
const all = Object.fromEntries(Object.entries(rawAll).map(([f, sql]) => [f, stripComments(sql)]));
const auth = all["0004_auth.sql"];

/* ================= 1. the reported bug class ================= */

test("no migration uses an invalid foreign-key action clause (ON RESTRICT regression)", () => {
  for (const [file, sql] of Object.entries(all)) {
    // `on restrict` / `on set default` without DELETE|UPDATE / bare `on cascade`
    assert.equal(/\bon\s+restrict\b/i.test(sql), false, `${file}: "ON RESTRICT" is not valid — use "ON DELETE RESTRICT"`);
    assert.equal(/\bon\s+cascade\b/i.test(sql), false, `${file}: "ON CASCADE" is not valid — use "ON DELETE CASCADE"`);
    assert.equal(/\bon\s+set\s+null\b/i.test(sql), false, `${file}: "ON SET NULL" is not valid — use "ON DELETE SET NULL"`);
    for (const { text: st, line } of splitStatements(sql)) {
      const refs = /\breferences\b/i.test(st);
      if (!refs) continue;
      const actions = st.match(/\bon\s+([a-z_]+)\b/gi) ?? [];
      for (const a of actions) {
        assert.match(a, /\bon\s+(delete|update)\b/i, `${file}:${line}: foreign-key action "${a.trim()}" needs a DELETE or UPDATE keyword`);
      }
      for (const a of actions) {
        assert.match(a, /\bon\s+(delete|update)\b/i, `${file}: foreign-key action "${a.trim()}" needs a DELETE or UPDATE keyword`);
      }
    }
  }
});

test("0004: the admin_users → admin_roles foreign key is ON DELETE RESTRICT", () => {
  const m = /add\s+constraint\s+admin_users_role_fkey[\s\S]*?;\s*$/im.exec(auth);
  assert.ok(m, "named foreign key admin_users_role_fkey must be added");
  assert.match(m[0], /foreign\s+key\s*\(\s*role\s*\)\s*references\s+admin_roles\s*\(\s*role\s*\)/i, "FK must be role → admin_roles(role)");
  assert.match(m[0], /on\s+delete\s+restrict/i, "role removal must be RESTRICTed, not cascaded");
  assert.equal(/on\s+restrict\b/i.test(m[0]), false, "must not regress to the invalid `on restrict`");
});

test("0004: auth.users foreign keys keep their intended delete behaviour", () => {
  const userFk = /add\s+constraint\s+admin_users_user_id_fkey[\s\S]*?;\s*$/im.exec(auth);
  assert.ok(userFk, "named foreign key admin_users_user_id_fkey must be added");
  assert.match(userFk[0], /references\s+auth\.users\s*\(\s*id\s*\)/i);
  // Deleting the Auth user must remove the admin grant…
  assert.match(userFk[0], /on\s+delete\s+cascade/i);

  const mediaFk = /add\s+constraint\s+media_assets_uploaded_by_fkey[\s\S]*?;\s*$/im.exec(auth);
  assert.ok(mediaFk, "named foreign key media_assets_uploaded_by_fkey must be added");
  // …but media metadata only loses the attribution, never the row.
  assert.match(mediaFk[0], /on\s+delete\s+set\s+null/i);
});

test("0004: admin_user_id has NO foreign key on purpose (audit must outlive the account)", () => {
  const addCol = /alter table admin_audit_logs add column if not exists admin_user_id[^;]*;/i.exec(auth);
  assert.ok(addCol, "admin_user_id column must be added idempotently");
  assert.equal(/references/i.test(addCol[0]), false, "audit identity column must not cascade away history");
  assert.match(auth, /comment on column admin_audit_logs\.admin_user_id/i, "the intentional no-FK decision must be documented in-schema");
});

test("the ON RESTRICT regression is documented in the migration itself", () => {
  assert.match(rawAll["0004_auth.sql"], /`ON RESTRICT` is not a foreign-key action/i, "the migration must explain why the first revision failed");
});

/* ================= 2. idempotency (must survive a part-applied run) ================= */

test("every migration is safe to re-run: objects use IF NOT EXISTS", () => {
  for (const [file, sql] of Object.entries(all)) {
    for (const { text, line } of splitStatements(sql)) {
      const excerpt = () => text.slice(0, 70).replace(/\s+/g, " ");
      if (/\bcreate\s+table\b/i.test(text) && !/create\s+table\s+if\s+not\s+exists/i.test(text)) {
        assert.fail(`${file}:${line}: \`create table\` must be \`create table if not exists\` — got "${excerpt()}"`);
      }
      if (/\bcreate\s+index\b/i.test(text) && !/create\s+index\s+if\s+not\s+exists/i.test(text)) {
        assert.fail(`${file}:${line}: \`create index\` must be \`create index if not exists\` — got "${excerpt()}"`);
      }
      if (/\bcreate\s+(or\s+replace\s+)?view\b/i.test(text) && !/create\s+(or\s+replace\s+)?view\s+if\s+not\s+exists/i.test(text)) {
        assert.fail(`${file}:${line}: \`create view\` must be \`create view if not exists\` (or use CREATE OR REPLACE) — got "${excerpt()}"`);
      }
      assert.equal(/\bdrop\s+table\b/i.test(text), false, `${file}:${line}: migrations must never drop tables — got "${excerpt()}"`);
      assert.equal(/\btruncate\b/i.test(text), false, `${file}:${line}: migrations must never truncate data — got "${excerpt()}"`);
    }
  }
});

test("0004: every trigger, policy and constraint is dropped before it is created", () => {
  for (const kind of ["trigger", "policy"]) {
    const re = new RegExp(`create\\s+${kind}\\s+([a-z_0-9]+)`, "gi");
    let m;
    while ((m = re.exec(auth))) {
      const name = m[1];
      assert.match(auth, new RegExp(`drop\\s+${kind}\\s+if\\s+exists\\s+${name}\\b`, "i"), `create ${kind} ${name} must be preceded by drop ${kind} if exists`);
    }
  }
  const added = [...auth.matchAll(/add\s+constraint\s+([a-z_0-9]+)/gi)].map((m) => m[1]);
  assert.ok(added.length >= 3, "expected the three convergent foreign keys");
  for (const name of added) {
    assert.match(auth, new RegExp(`drop\\s+constraint\\s+if\\s+exists\\s+${name}\\b`, "i"), `add constraint ${name} must be preceded by drop constraint if exists`);
  }
});

test("0004: the seeded admin role is inserted without overwriting operator edits", () => {
  assert.match(auth, /insert\s+into\s+admin_roles[\s\S]*?on\s+conflict\s*\(role\)\s*do\s+nothing;/i, "seed must be `on conflict (role) do nothing`");
  assert.equal(/on\s+conflict\s*\(role\)\s*do\s+update/i.test(auth), false, "a re-run must not clobber hand-edited permissions");
  for (const p of ["dashboard.read", "content.read", "content.write", "inbox.read", "inbox.write", "audit.read", "media.read", "media.write", "settings.read", "settings.write", "admin.manage"]) {
    assert.ok(auth.includes(`'${p}'`), `seeded admin role must grant ${p}`);
  }
});

test("0004: dollar-quoted function bodies are balanced", () => {
  assert.equal((auth.match(/\$\$/g) ?? []).length % 2, 0, "unbalanced $$ quoting truncates the migration mid-file");
  assert.match(auth, /create\s+or\s+replace\s+function\s+admin_audit_logs_is_append_only\(\)[\s\S]*?\$\$;?/i);
});

/* ================= 3. authorization / RLS behaviour preserved ================= */

test("0004: RLS is enabled on both new auth tables", () => {
  assert.match(auth, /alter\s+table\s+admin_users\s+enable\s+row\s+level\s+security/i);
  assert.match(auth, /alter\s+table\s+admin_roles\s+enable\s+row\s+level\s+security/i);
});

test("0004: admin_users exposes only the caller's own row; the catalogue only to active admins", () => {
  assert.match(auth, /create\s+policy\s+admin_users_select_self\s+on\s+admin_users\s+for\s+select\s+to\s+authenticated\s+using\s*\(\(select\s+auth\.uid\(\)\)\s*=\s*user_id\)/i);
  const p = /create\s+policy\s+admin_roles_select_active_admin[\s\S]*?;/i.exec(auth);
  assert.ok(p);
  assert.match(p[0], /exists\s*\([\s\S]*from\s+public\.admin_users[\s\S]*is_active/i, "catalogue read must require an ACTIVE admin");
  // Neither policy may widen access to anon.
  assert.equal(/to\s+anon\b/i.test(auth), false, "no policy may grant anon access to the auth tables");
});

test("0004: storage keeps public read and admin-only writes", () => {
  const write = /create\s+policy\s+media_admin_write[\s\S]*?;/i.exec(auth);
  assert.ok(write);
  assert.match(write[0], /for\s+insert\s+to\s+authenticated/i);
  assert.match(write[0], /bucket_id\s*=\s*'media'/);
  assert.match(write[0], /is_active/);
  for (const name of ["media_admin_update", "media_admin_delete"]) {
    const p = new RegExp(`create\\s+policy\\s+${name}[\\s\\S]*?;`, "i").exec(auth);
    assert.ok(p, `${name} must exist`);
    assert.match(p[0], /to\s+authenticated/i);
    assert.match(p[0], /is_active/i);
  }
});

test("0004: the append-only audit trigger exempts only the operator roles", () => {
  const fn = /create\s+or\s+replace\s+function\s+admin_audit_logs_is_append_only[\s\S]*?\$\$;/i.exec(auth);
  assert.ok(fn);
  assert.match(fn[0], /raise\s+exception\s+'admin_audit_logs is append-only/i);
  assert.match(fn[0], /current_user\s+in\s*\('postgres',\s*'supabase_admin'\)/i, "exemption list must stay explicit and minimal");
  // authenticated / anon / service_role must NOT be exempted
  assert.equal(/current_user\s+in\s*\([^)]*service_role/i.test(fn[0]), false, "service_role must not be able to rewrite the journal");
});

/* ================= 4. APPLY-ALL mirrors the migrations ================= */

test("APPLY-ALL.sql contains every migration file verbatim (it is generated concatenation)", () => {
  const applyAllRaw = readFileSync(join(ROOT, "supabase", "APPLY-ALL.sql"), "utf8");
  const applyAll = stripComments(applyAllRaw);
  for (const f of migrationFiles) {
    const body = stripComments(rawAll[f]).trim();
    assert.ok(applyAll.includes(body.slice(0, 400)), `APPLY-ALL.sql is missing the head of ${f} — regenerate it`);
    assert.ok(applyAll.includes(body.slice(-400)), `APPLY-ALL.sql is truncated for ${f} — regenerate it`);
  }
  assert.equal(/\bon\s+restrict\b/i.test(applyAll), false, "APPLY-ALL.sql must not carry the invalid FK clause");
});

/* ================= 5. optional: real PostgreSQL grammar ================= */

test("migrations parse under the real PostgreSQL grammar (when the parser is installed)", async (t) => {
  const has = existsSync(join(ROOT, "node_modules/pg-query-emscripten"));
  if (!has) {
    t.skip("pg-query-emscripten not installed — run `npm install --no-save pg-query-emscripten` (CI installs it)");
    return;
  }
  const Module = (await import("pg-query-emscripten")).default;
  for (const [file, sql] of Object.entries(all)) {
    // A fresh module per file: the wasm heap degrades after large inputs.
    const mod = await new Module();
    let res = null;
    try {
      res = mod.parse(sql);
    } catch {
      continue; // module could not evaluate this size — scripts/check-sql.mjs covers it per statement
    }
    assert.equal(res?.error ? `${file}: ${res.error.message ?? "syntax error"}` : null, null, "migration must parse");
  }
});
