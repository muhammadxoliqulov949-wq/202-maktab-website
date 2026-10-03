#!/usr/bin/env node
/**
 * scripts/verify-migrations.mjs — execute the SQL migrations on a REAL PostgreSQL.
 *
 * Why: `npm run verify:supabase` needs live Supabase credentials, so the migration
 * files themselves were only ever eyeballed — and `0004_auth.sql` shipped with
 * `references admin_roles (role) on restrict`, which PostgreSQL rejects. A human
 * hit that in the SQL Editor, and the run stopped mid-file, leaving the project
 * part-migrated. Syntax that Postgres can reject must be executed before a human
 * pastes it.
 *
 * `@electric-sql/pglite` is real PostgreSQL (v18) compiled to wasm, so this is not
 * a "SQL parser" approximation: DDL, FK actions, triggers and RLS policies all
 * behave as they do on the server. Supabase-specific objects the migrations depend
 * on (auth.users, storage.objects, the anon/authenticated/service_role roles,
 * auth.uid()) are emulated — see bootstrapSupabase().
 *
 * What it proves:
 *   1. the ORIGINAL broken migration fails here with the same error the user saw;
 *   2. the fixed migration applies cleanly on a clean Phase 3 database;
 *   3. it also converges on a database left PART-migrated by that failed run;
 *   4. re-running it any number of times is a no-op (idempotency);
 *   5. the FK/RLS/storage semantics actually behave as documented.
 *
 * Usage:  node scripts/verify-migrations.mjs        (--verbose for every check)
 * Exit:   0 all good · 2 skipped (pglite missing) · 1 a check failed
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { splitStatements } from "./lib/sql.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const MIG = join(ROOT, "supabase/migrations");
const FILES = ["0001_initial_schema.sql", "0002_rls.sql", "0003_storage.sql", "0004_auth.sql"];
const VERBOSE = process.argv.includes("--verbose");

let passed = 0;
const failures = [];

function ok(name, detail = "") {
  passed++;
  if (VERBOSE) console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, why) {
  failures.push({ name, why });
  console.error(`  ✗ ${name}\n      ${String(why).split("\n").join("\n      ")}`);
}
async function check(name, fn) {
  try {
    const detail = await fn();
    ok(name, typeof detail === "string" ? detail : "");
  } catch (e) {
    fail(name, e?.message ?? e);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* ------------------------------------------------------------------ */
/* Supabase runtime emulation                                          */
/* ------------------------------------------------------------------ */

/**
 * The pieces `supabase/migrations/*.sql` reference but do not create, because on
 * Supabase the platform owns them. Kept deliberately small and faithful.
 */
async function bootstrapSupabase(db) {
  await execScript(db, `
    -- platform roles
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create role supabase_admin login;

    -- Auth: the GoTrue table + helpers the migrations and policies call
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key,
      email text unique,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      banned_at timestamptz,
      created_at timestamptz not null default now()
    );
    create or replace function auth.uid() returns uuid
      language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;
    create or replace function auth.role() returns text
      language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '')::text $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant select on auth.users to authenticated, service_role;

    -- Storage: bucket + object registry the storage policies are written against
    create schema if not exists storage;
    create table if not exists storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false
    );
    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null references storage.buckets (id),
      name text,
      owner uuid,
      created_at timestamptz not null default now()
    );
    alter table storage.objects enable row level security;
    alter table storage.buckets enable row level security;
    grant usage on schema storage to anon, authenticated, service_role;
    grant select on storage.buckets to anon, authenticated, service_role;
    grant select on storage.objects to anon, authenticated, service_role;
    grant insert, update, delete on storage.objects to authenticated, service_role;
    create policy buckets_read on storage.buckets for select using (true);

    -- The app schema, with Supabase's default grants + RLS model
    grant usage on schema public to anon, authenticated, service_role;
    grant all on all tables in schema public to anon, authenticated, service_role;
    grant all on all sequences in schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);
}

/** Run one migration file statement-by-statement, like the SQL Editor does. */
async function runFile(db, sql, { stopOnFirstError = true } = {}) {
  const statements = splitStatements(sql);
  const errors = [];
  for (const st of statements) {
    try {
      await db.exec(st.text);
    } catch (e) {
      const message = String(e?.message ?? e).replace(/^Execution failed:\s*/m, "").split("\n")[0];
      errors.push({ line: st.line, message, snippet: st.text.split("\n")[0].trim().slice(0, 90) });
      if (stopOnFirstError) return { applied: statements.indexOf(st), total: statements.length, errors };
    }
  }
  return { applied: statements.length, total: statements.length, errors };
}

const readMigration = (f) => readFileSync(join(MIG, f), "utf8");

/**
 * Runs a script one statement at a time through the same quote-aware splitter the
 * migrations use, so a `;` inside a `$$ … $$` body can never truncate a statement
 * mid-way (which is how the SQL Editor behaves and how psql feeds a file).
 */
async function execScript(db, sql) {
  for (const st of splitStatements(sql)) {
    await db.exec(st.text);
  }
}

/** The broken revision as it still sits in git HEAD (before this fix). */
function brokenMigrationFromGit() {
  try {
    const text = execFileSync("git", ["show", `HEAD:supabase/migrations/0004_auth.sql`], { cwd: ROOT, encoding: "utf8" });
    return /on\s+restrict\b/i.test(text) ? text : null;
  } catch {
    return null;
  }
}

/** Open PGlite with the extensions `0001_initial_schema.sql` expects. */
async function openDb() {
  const { PGlite } = await import("@electric-sql/pglite");
  let options;
  try {
    // pgcrypto backs gen_random_uuid(); supplied by Supabase on the real project.
    const { pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto");
    options = { extensions: { pgcrypto } };
  } catch {
    /* contrib layout changed — the migration will report the missing extension */
  }
  return new PGlite(options);
}

async function freshDb() {
  const db = await openDb();
  await bootstrapSupabase(db);
  for (const f of FILES.slice(0, 3)) {
    const r = await runFile(db, readMigration(f));
    assert(r.errors.length === 0, `phase 3 migrations must apply cleanly; ${f} failed: ${JSON.stringify(r.errors[0])}`);
  }
  return db;
}

async function tableExists(db, name) {
  const r = await db.query(
    `select 1 from pg_tables where schemaname = 'public' and tablename = $1`,
    [name]
  );
  return r.rows.length > 0;
}

/* ------------------------------------------------------------------ */
/* checks                                                             */
/* ------------------------------------------------------------------ */

async function main() {
  if (!existsSync(join(ROOT, "node_modules/@electric-sql/pglite"))) {
    console.log("! SKIP — @electric-sql/pglite is not installed (`npm ci`).");
    console.log("! This is the only gate that EXECUTES the migrations; do not ship a migration without it.");
    process.exit(2);
  }
  console.log("Migration execution check — real PostgreSQL via PGlite (Supabase objects emulated)\n");

  const broken = brokenMigrationFromGit();

  /* A. reproduce the reported failure */
  if (broken) {
    console.log("A. the reported failure (git HEAD revision)");
    await check("the broken 0004 fails on a Phase 3 database", async () => {
      const db = await freshDb();
      const r = await runFile(db, broken);
      assert(r.errors.length > 0, "expected the broken migration to FAIL, but it applied cleanly");
      const e = r.errors[0];
      assert(/syntax error at or near "restrict"/i.test(e.message), `expected the exact user-facing error, got: ${e.message}`);
      return `${e.message} (line ${e.line}, statement ${r.applied + 1}/${r.total})`;
    });
    await check("that failure leaves the database PART-applied (the reason convergence matters)", async () => {
      const db = await freshDb();
      await runFile(db, broken);
      assert(await tableExists(db, "admin_roles"), "admin_roles is created before the bad statement");
      assert(!(await tableExists(db, "admin_users")), "admin_users must NOT exist after the aborted run");
      return "admin_roles present, admin_users absent — exactly the state the real project is in";
    });
    await check("the fixed migration converges on that part-applied state", async () => {
      const db = await freshDb();
      await runFile(db, broken);
      const r = await runFile(db, readMigration("0004_auth.sql"));
      assert(r.errors.length === 0, `re-running 0004 must recover, got: ${JSON.stringify(r.errors[0])}`);
      assert(await tableExists(db, "admin_users"), "admin_users must exist after the fixed run");
      return `${r.applied}/${r.total} statements applied with no error`;
    });
  } else {
    console.log("A. skipped — git HEAD no longer contains the broken revision (already merged)");
  }

  /* B. clean apply + idempotency */
  console.log("\nB. clean apply and idempotency");
  const db = await freshDb();
  await check("0001–0003 + 0004 apply cleanly in order", async () => {
    const r = await runFile(db, readMigration("0004_auth.sql"));
    assert(r.errors.length === 0, JSON.stringify(r.errors[0]));
    return `${r.total} statements`;
  });
  await check("re-running 0004 twice is a no-op (safe to paste again)", async () => {
    for (let i = 0; i < 2; i++) {
      const r = await runFile(db, readMigration("0004_auth.sql"));
      assert(r.errors.length === 0, `re-run ${i + 1} failed: ${JSON.stringify(r.errors[0])}`);
    }
    const rows = await db.query(`select count(*)::int as c from admin_roles`);
    assert(rows.rows[0].c === 1, `the role seed must not duplicate rows on re-run (got ${rows.rows[0].c})`);
    return "2 extra runs, no errors, no duplicated seed rows";
  });
  await check("APPLY-ALL.sql applies on an empty database", async () => {
    const bare = await openDb();
    await bootstrapSupabase(bare);
    const r = await runFile(bare, readFileSync(join(ROOT, "supabase/APPLY-ALL.sql"), "utf8"));
    assert(r.errors.length === 0, JSON.stringify(r.errors[0]));
    await bare.close();
    return `${r.total} statements from an empty schema`;
  });

  /* C. structural reality of the constraints */
  console.log("\nC. foreign keys behave as intended");
  await check("admin_users.role → admin_roles.role is RESTRICT on delete", async () => {
    const fk = await db.query(`select confdeltype from pg_constraint where conname = 'admin_users_role_fkey'`);
    assert(fk.rows.length === 1, "admin_users_role_fkey must exist");
    assert(fk.rows[0].confdeltype === "r", `ON DELETE action must be RESTRICT ('r'), got '${fk.rows[0].confdeltype}'`);

    const tmpId = "00000000-0000-0000-0000-00000000000a";
    await db.exec(`insert into auth.users (id, email) values ('${tmpId}', 'temporary@example.test')`);
    await db.exec(`insert into admin_roles (role, description, permissions) values ('temporary', 'fixture', array[]::text[])`);
    await db.exec(`insert into admin_users (user_id, email, role) values ('${tmpId}', 'temporary@example.test', 'temporary')`);

    let blocked = null;
    try {
      await db.exec(`delete from admin_roles where role = 'temporary'`);
    } catch (e) {
      blocked = e;
    }
    assert(blocked !== null, "dropping a role that is still assigned must be blocked — that is what RESTRICT buys the admin model");
    await db.exec(`delete from admin_users where role = 'temporary'`);
    // An unassigned role may still be retired — RESTRICT must not freeze the catalogue.
    await db.exec(`delete from admin_roles where role = 'temporary'`);
    await db.exec(`delete from auth.users where id = '${tmpId}'`);
    return "in-use role protected · unused role deletable";
  });
  await check("deleting an auth user cascades the grant but only nulls media attribution", async () => {
    const adminId = "00000000-0000-0000-0000-0000000000b1";
    const otherId = "00000000-0000-0000-0000-0000000000b2";
    await db.exec(`insert into auth.users (id, email) values ('${adminId}', 'cascade-1@example.test'), ('${otherId}', 'cascade-2@example.test')`);
    await db.exec(`insert into admin_users (user_id, email, role) values ('${adminId}', 'cascade-1@example.test', 'admin'), ('${otherId}', 'cascade-2@example.test', 'admin')`);
    await db.exec(`insert into media_assets (id, file_name, public_url, uploaded_by) values ('00000000-0000-0000-0000-0000000000c1', 'cascade.png', 'https://example.test/x', '${adminId}')`);
    await db.exec(`delete from auth.users where id = '${adminId}'`);
    const grants = await db.query(`select count(*)::int as c from admin_users`);
    const media = await db.query(`select uploaded_by from media_assets where id = '00000000-0000-0000-0000-0000000000c1'`);
    assert(grants.rows[0].c === 1, `the deleted admin's row must cascade away (remaining: ${grants.rows[0].c})`);
    assert(media.rows.length === 1, "the media row must SURVIVE attribution loss");
    assert(media.rows[0].uploaded_by === null, "uploaded_by must be set to null, not cascade the asset");
    await db.exec(`delete from auth.users where id = '${otherId}'`);
    return "grant cascade · media SET NULL · history kept";
  });
  await check("admin_users.user_id is unique (one grant per Auth user)", async () => {
    const id = "00000000-0000-0000-0000-0000000000d1";
    await db.exec(`insert into auth.users (id, email) values ('${id}', 'dup@example.test')`);
    await db.exec(`insert into admin_users (user_id, email, role) values ('${id}', 'dup@example.test', 'admin')`);
    let dup = null;
    try {
      await db.exec(`insert into admin_users (user_id, email, role) values ('${id}', 'dup@example.test', 'admin')`);
    } catch (e) {
      dup = e;
    }
    assert(dup !== null, "a duplicate grant for the same user id must be rejected");
    await db.exec(`delete from admin_users where user_id = '${id}'`);
    await db.exec(`delete from auth.users where id = '${id}'`);
    return "duplicate rejected";
  });
  await check("audit identity columns exist and admin_user_id has no FK", async () => {
    const cols = await db.query(
      `select column_name, data_type from information_schema.columns
        where table_schema = 'public' and table_name = 'admin_audit_logs'
          and column_name in ('admin_user_id','admin_email','ip_address')`
    );
    assert(cols.rows.length === 3, `expected 3 new audit columns, got ${JSON.stringify(cols.rows)}`);
    const fk = await db.query(
      `select count(*)::int as c from pg_constraint
        where conrelid = 'admin_audit_logs'::regclass and contype = 'f'`
    );
    assert(fk.rows[0].c === 0, "audit rows must not be cascaded away — no FK expected");
    return "admin_user_id / admin_email / ip_address present, journal free of FKs";
  });

  /* D. runtime semantics: append-only + RLS + storage */
  console.log("\nD. row-level security and append-only audit");
  await check("journal is append-only even for the most privileged role", async () => {
    const id = "00000000-0000-0000-0000-0000000000e1";
    await db.exec(`insert into auth.users (id, email) values ('${id}', 'auditor@example.test')`);
    await db.exec(`insert into admin_users (user_id, email, role) values ('${id}', 'auditor@example.test', 'admin')`);
    await db.exec(`insert into admin_audit_logs (admin_user_id, admin_email, action, entity_type, entity_id, ip_address)
                   values ('${id}', 'auditor@example.test', 'LOGIN', 'auth_session', 'e1', '203.0.113.9')`);
    // service_role writes the journal in production and has BYPASSRLS, so RLS cannot
    // hide the row from it: only the trigger can. If UPDATE/DELETE survive here,
    // "the audit trail is trustworthy" is false.
    await db.exec(`set role service_role`);
    try {
      let upd = null;
      try {
        await db.exec(`update admin_audit_logs set action = 'REDACTED' where admin_email = 'auditor@example.test'`);
      } catch (e) {
        upd = e;
      }
      assert(upd !== null, "UPDATE on the journal must be blocked by the trigger even for service_role");
      assert(/append-only/i.test(String(upd.message)), `blocked for the documented reason, got: ${String(upd.message).split("\n")[0]}`);
      let del = null;
      try {
        await db.exec(`delete from admin_audit_logs where admin_email = 'auditor@example.test'`);
      } catch (e) {
        del = e;
      }
      assert(del !== null, "DELETE on the journal must be blocked by the trigger");
      const ins = await db.query(`insert into admin_audit_logs (action, entity_type, entity_id) values ('MEDIA_UPLOAD','media','m1') returning id`);
      assert(ins.rows.length === 1, "appending to the journal must stay allowed");
      const untouched = await db.query(`select action from admin_audit_logs where admin_email = 'auditor@example.test'`);
      assert(untouched.rows[0].action === 'LOGIN', "the original row must be unchanged");
      return "service_role: INSERT ok · UPDATE/DELETE refused · row unchanged";
    } finally {
      await db.exec(`reset role`);
      // Even the owner cannot escape the trigger… but it exempts the migration
      // role on purpose, so fixture cleanup runs as the default superuser role.
      await db.exec(`delete from admin_audit_logs where action = 'MEDIA_UPLOAD'`);
    }
  });
  await check("no policy exposes the journal to signed-in non-owners", async () => {
    await db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}'`);
    try {
      const r = await db.query(`select * from public.admin_audit_logs`);
      assert(r.rows.length === 0, `admin must not read the journal through RLS directly (audit.read is served by the API), saw ${r.rows.length}`);
      return "RLS keeps it server-only";
    } finally {
      await db.exec(`reset role; reset request.jwt.claims`);
      await db.exec(`delete from admin_users where user_id = '00000000-0000-0000-0000-0000000000e1'`);
      await db.exec(`delete from auth.users where id = '00000000-0000-0000-0000-0000000000e1'`);
    }
  });
  await check("anon cannot read the authorization tables", async () => {
    await db.exec(`set role anon; set request.jwt.claims = '{"role":"anon"}'`);
    try {
      for (const t of ["admin_users", "admin_roles", "contact_submissions", "admin_audit_logs"]) {
        const r = await db.query(`select * from public.${t}`).catch((e) => ({ denied: String(e.message) }));
        if (r.denied) continue; // a permission denial is also correct
        assert(r.rows.length === 0, `anon must see no ${t} rows, saw ${r.rows.length}`);
      }
      return "no admin/inbox/audit data reachable as anon";
    } finally {
      await db.exec(`reset role; reset request.jwt.claims`);
    }
  });
  await check("an authenticated non-admin sees nobody's admin_users row", async () => {
    const adminId = "00000000-0000-0000-0000-0000000000f1";
    const userId = "00000000-0000-0000-0000-0000000000f2";
    await db.exec(`insert into auth.users (id, email) values ('${adminId}', 'rls-admin@example.test'), ('${userId}', 'rls-user@example.test')`);
    await db.exec(`insert into admin_users (user_id, email, role) values ('${adminId}', 'rls-admin@example.test', 'admin')`);
    await db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}'`);
    try {
      const r = await db.query(`select * from public.admin_users`);
      assert(r.rows.length === 0, `a plain user must not read the admin roster, saw ${r.rows.length}`);
      const self = await db.query(`select * from public.admin_roles`);
      assert(self.rows.length === 0, "the role catalogue is admin-only");
      return "0 rows for a non-admin";
    } finally {
      await db.exec(`reset role; reset request.jwt.claims`);
    }
  });
  await check("an admin reads exactly their own grant row", async () => {
    const adminId = "00000000-0000-0000-0000-0000000000f1";
    const otherId = "00000000-0000-0000-0000-0000000000f3";
    await db.exec(`insert into auth.users (id, email) values ('${otherId}', 'other@example.test')`);
    await db.exec(`insert into admin_users (user_id, email, role) values ('${otherId}', 'other@example.test', 'admin')`);
    await db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${adminId}","role":"authenticated"}'`);
    try {
      const mine = await db.query(`select user_id from public.admin_users`);
      assert(mine.rows.length === 1, `admin must see only their own row, saw ${mine.rows.length}`);
      assert(String(mine.rows[0].user_id) === adminId, "wrong row returned");
      const roles = await db.query(`select role from public.admin_roles`);
      assert(roles.rows.length >= 1, "an active admin may read the role catalogue");
      return "own row + catalogue only";
    } finally {
      await db.exec(`reset role; reset request.jwt.claims`);
      await db.exec(`delete from admin_users where user_id in ('${adminId}','${otherId}')`);
      await db.exec(`delete from auth.users where id in ('${adminId}','${otherId}')`);
    }
  });
  await check("storage: active admin may write, inactive admin and plain user may not", async () => {
    const active = "00000000-0000-0000-0000-0000000001a1";
    const inactive = "00000000-0000-0000-0000-0000000001a2";
    const plain = "00000000-0000-0000-0000-0000000001a3";
    await db.exec(`insert into auth.users (id, email) values
      ('${active}', 'a@example.test'), ('${inactive}', 'i@example.test'), ('${plain}', 'p@example.test')`);
    await db.exec(`insert into admin_users (user_id, email, role, is_active) values
      ('${active}', 'a@example.test', 'admin', true), ('${inactive}', 'i@example.test', 'admin', false)`);

    const tryInsert = async (sub, label) => {
      await db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${sub}","role":"authenticated"}'`);
      try {
        await db.query(
          `insert into storage.objects (bucket_id, name) values ('media', '${label}.png') returning id`
        );
        return true;
      } catch {
        return false;
      } finally {
        await db.exec(`reset role; reset request.jwt.claims`);
      }
    };
    const adminCan = await tryInsert(active, "admin-upload");
    const inactiveCan = await tryInsert(inactive, "inactive-upload");
    const plainCan = await tryInsert(plain, "plain-upload");
    const stray = await db.query(`select name from storage.objects where bucket_id = 'media'`);
    assert(adminCan === true, "an ACTIVE admin must be able to upload");
    assert(inactiveCan === false, "a DEACTIVATED admin must be refused — revocation has to bite at the database");
    assert(plainCan === false, "a non-admin must be refused");
    assert(stray.rows.every((r) => r.name === "admin-upload.png"), `only the admin row may exist: ${JSON.stringify(stray.rows)}`);
    await db.exec(`delete from storage.objects where bucket_id = 'media'`);
    await db.exec(`delete from admin_users where user_id in ('${active}','${inactive}')`);
    await db.exec(`delete from auth.users where id in ('${active}','${inactive}','${plain}')`);
    return "1 accepted, 2 refused by policy";
  });
  await check("public content remains readable through the service role", async () => {
    await db.exec(`set role service_role`);
    try {
      for (const t of ["news_articles", "team_members", "gallery_items", "faqs", "statistics", "site_settings", "quick_links"]) {
        const r = await db.query(`select count(*)::int as c from public.${t}`);
        assert(r.rows.length === 1, `${t} must be queryable by the API server`);
      }
      const inbox = await db.query(`select count(*)::int as c from contact_submissions`);
      assert(inbox.rows[0].c === 0, "inbox should be empty at this point in the run");
      return "no regression for the public API path";
    } finally {
      await db.exec(`reset role`);
    }
  });

  /* E. the data layer still works on top of Phase 4 */
  console.log("\nE. seed + public content on top of the new auth tables");
  await check("SEED.sql applies after 0001–0004 and fills the public tables", async () => {
    const seeded = await openDb();
    await bootstrapSupabase(seeded);
    for (const f of FILES) await runFile(seeded, readMigration(f));
    await execScript(seeded, readFileSync(join(ROOT, "supabase/SEED.sql"), "utf8"));
    const counts = {};
    for (const t of ["news_articles", "team_members", "gallery_items", "faqs", "statistics"]) {
      const r = await seeded.query(`select count(*)::int as c from public.${t}`);
      counts[t] = r.rows[0].c;
    }
    assert(counts.news_articles === 6, `expected 6 seeded news articles, got ${counts.news_articles}`);
    assert(counts.team_members === 16, `expected 16 team members, got ${counts.team_members}`);
    assert(counts.gallery_items === 13, `expected 13 gallery items, got ${counts.gallery_items}`);
    assert(counts.faqs >= 1 && counts.statistics >= 1, "core public content must survive the auth migration");
    const t2 = await seeded.query(
      `select count(*)::int as c from pg_tables where schemaname = 'public' and rowsecurity`
    );
    const t1 = await seeded.query(`select count(*)::int as c from pg_tables where schemaname = 'public'`);
    assert(t2.rows[0].c === t1.rows[0].c, `every table must stay RLS-protected (${t2.rows[0].c}/${t1.rows[0].c})`);
    await seeded.close();
    return `6 news · 16 team · 13 gallery · RLS on ${t2.rows[0].c}/${t1.rows[0].c} tables`;
  });

  /* ------------------------------------------------------------------ */
  console.log(`\n${failures.length === 0 ? "✓" : "✗"} ${passed} check(s) passed, ${failures.length} failed — executed on PostgreSQL 18 (PGlite)`);
  if (failures.length) {
    console.error("\nFailed:");
    for (const f of failures) console.error(`  • ${f.name}: ${String(f.why).split("\n")[0]}`);
    process.exit(1);
  }
  if (!VERBOSE) console.log("(run with --verbose to list every check)");
}

// Only run as a CLI entrypoint — importing this module for its helpers must not
// boot a database and re-run the whole suite.
const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").slice(-1)[0]);
if (invokedDirectly) {
  main().catch((e) => {
    console.error(`\n✗ verify-migrations crashed: ${e?.stack ?? e}`);
    process.exit(1);
  });
}

export { openDb, execScript, freshDb, runFile, bootstrapSupabase, readMigration };
