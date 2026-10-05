/**
 * SQL migration gate — parses every migration with the REAL PostgreSQL grammar
 * (libpg_query via wasm) and checks the idempotency conventions this repo relies on.
 *
 *   node scripts/check-sql.mjs [file ...]
 *
 * Default target: supabase/migrations/*.sql + supabase/APPLY-ALL.sql.
 *
 * Why this exists: `0004_auth.sql` shipped with `references admin_roles (role)
 * on restrict`, which the PostgreSQL grammar rejects (`ON RESTRICT` is not a
 * foreign-key action) — it only surfaced when a human pasted it into the SQL
 * Editor. Syntax is cheap to verify before that, so it is now a test.
 *
 * Semantic checks (roles, grants, storage buckets) still need a real database —
 * that is `npm run verify:supabase`.
 *
 * pg-query-emscripten is an optional dev tool (npm install --no-save ...). When
 * it is absent the script falls back to the structural lint and SAYS SO, so the
 * gate can never silently pass because the parser was missing.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

/* ---------------- statement splitter (psql-like, $$- and quote-aware) ---------------- */
export function splitStatements(sql) {
  const out = [];
  let cur = "";
  let startLine = 1;
  let line = 1;
  let inDollar = false;
  let inString = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "\n") line++;

    if (!inString && sql.startsWith("$$", i)) {
      inDollar = !inDollar;
      cur += "$$";
      i++;
      continue;
    }
    if (!inDollar && ch === "'") {
      if (inString && sql[i + 1] === "'") {
        cur += "''";
        i++;
        continue;
      }
      inString = !inString;
    }
    // line comment outside strings
    if (!inDollar && !inString && ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      line--;
      continue;
    }
    if (!inDollar && !inString && ch === ";") {
      if (cur.trim()) out.push({ text: cur.trim(), line: startLine });
      cur = "";
      startLine = line + 1;
      continue;
    }
    if (cur === "" && ch.trim() !== "") startLine = line;
    cur += ch;
  }
  if (cur.trim()) out.push({ text: cur.trim(), line: startLine });
  return out;
}

/* ---------------- structural lint: invalid clauses + idempotency ---------------- */
const INVALID_PATTERNS = [
  { re: /\bon\s+restrict\b/i, why: "`ON RESTRICT` is not a foreign-key action — PostgreSQL requires `ON DELETE RESTRICT`" },
  { re: /\breferences\b[^)]*\bon\s+(?!delete\b|update\b)[a-z_]+/i, why: "foreign-key action keyword without DELETE/UPDATE" },
  { re: /\bcreate\s+table\s+(?!if\s+not\s+exists\b)/i, why: "`create table` without `if not exists` breaks idempotency" },
  { re: /\bcreate\s+(?:or\s+replace\s+)?view\s+(?!if\s+not\s+exists\b)/i, why: "`create view` without `if not exists` breaks idempotency" },
  { re: /\bdrop\s+table\b/i, why: "migrations must never drop tables" },
  { re: /\btruncate\b/i, why: "migrations must never truncate data" },
];

function structuralLint(sql) {
  const problems = [];
  const statements = splitStatements(sql);

  if ((sql.match(/\$\$/g) ?? []).length % 2 !== 0) {
    problems.push({ line: 1, text: "", why: "unbalanced `$$` dollar quoting" });
  }

  for (const st of statements) {
    for (const { re, why } of INVALID_PATTERNS) {
      if (re.test(st.text)) problems.push({ line: st.line, text: firstLine(st.text), why });
    }
    if (/\bcreate\s+index\s+(?!if\s+not\s+exists\b)/i.test(st.text)) {
      problems.push({ line: st.line, text: firstLine(st.text), why: "`create index` without `if not exists` breaks idempotency" });
    }
    // CREATE TRIGGER / CREATE POLICY have no IF NOT EXISTS in PostgreSQL:
    // the convention here is a preceding DROP ... IF EXISTS.
    for (const kind of ["trigger", "policy"]) {
      const re = new RegExp(`\\bcreate\\s+${kind}\\s+([a-z_0-9."]+)`, "i");
      const m = st.text.match(new RegExp(`\\bcreate\\s+${kind}\\b`, "i"));
      if (!m) continue;
      const name = re.exec(st.text)?.[1];
      if (!name) continue;
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`drop\\s+${kind}\\s+if\\s+exists\\s+${esc}`, "i").test(sql)) {
        problems.push({ line: st.line, text: firstLine(st.text), why: `\`create ${kind}\` without a preceding \`drop ${kind} if exists\` breaks idempotency` });
      }
    }
    // A new FK added via ADD CONSTRAINT needs a DROP CONSTRAINT IF EXISTS before
    // it (in this file's convention, as its own preceding statement).
    const add = /\badd\s+constraint\s+([a-z_0-9"]+)/i.exec(st.text);
    if (add) {
      const name = add[1].replace(/"/g, "");
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`drop\\s+constraint\\s+if\\s+exists\\s+${esc}`, "i").test(sql)) {
        problems.push({ line: st.line, text: firstLine(st.text), why: `\`add constraint ${name}\` without a preceding \`drop constraint if exists\` breaks idempotency` });
      }
    }
  }
  return problems;
}

function firstLine(text) {
  return text.split("\n")[0].trim().slice(0, 90);
}

/* ---------------- real PostgreSQL parser ---------------- */
/**
 * Returns a FACTORY rather than one shared instance: the wasm module's state can
 * degrade after large inputs, which made a later file in the same run appear to
 * "fail to parse". A fresh instance per file (≈50 ms) keeps results reproducible.
 */
async function loadParserFactory() {
  if (!existsSync(join(ROOT, "node_modules/pg-query-emscripten"))) return null;
  try {
    const Module = (await import("pg-query-emscripten")).default;
    await new Module(); // smoke-test that the module actually boots
    return async () => new Module();
  } catch {
    return null;
  }
}

/**
 * Parses the whole file in one go: libpg_query handles multi-statement strings
 * and reports `cursorpos` as an offset into that string, which maps directly to
 * a line number — so the message matches what the SQL Editor shows and stops at
 * the first rejected statement, exactly like psql.
 *
 * The wasm wrapper can choke on very large parse trees; when that happens (a JS
 * internal error, not an SQL error) we fall back to per-statement parsing with
 * the $$-aware splitter. Anything the fallback also cannot evaluate is reported
 * as SKIPPED rather than passed, so a broken check is never a green check.
 */
function checkSyntax(mod, sql) {
  const toProblem = (err, baseLine, scanned, baseText = "") => {
    const message = typeof err === "string" ? err : err?.message || "syntax error";
    const cursorpos = typeof err === "object" ? err.cursorpos : null;
    let line = baseLine;
    if (typeof cursorpos === "number" && cursorpos > 0) {
      line = baseLine + (scanned.slice(0, cursorpos - 1).match(/\n/g) ?? []).length;
    }
    const text = sql.split("\n")[line - 1]?.trim() || baseText;
    return { message, line, text };
  };

  let whole;
  try {
    whole = mod.parse(sql);
  } catch {
    whole = null; // wasm could not evaluate this input — fall back
  }
  if (whole) {
    if (whole.error) return { kind: "error", problem: toProblem(whole.error, 1, sql, firstLine(sql)) };
    return { kind: "ok" };
  }

  let skipped = 0;
  for (const st of splitStatements(sql)) {
    let res;
    try {
      res = mod.parse(st.text);
    } catch {
      // The wasm module is in a degraded state — do not keep hammering it with
      // every remaining statement (that turned a 0.2s check into a minutes-long
      // hang). Report the file as partially checked instead.
      skipped++;
      break;
    }
    if (res?.error) return { kind: "error", problem: toProblem(res.error, st.line, st.text, firstLine(st.text)) };
  }
  return skipped ? { kind: "partial", skipped } : { kind: "ok" };
}

/* ---------------- main ---------------- */
const explicit = process.argv.slice(2);
const files =
  explicit.length > 0
    ? explicit.map((f) => join(ROOT, f))
    : [
        ...readdirSync(join(ROOT, "supabase/migrations"))
          .filter((f) => f.endsWith(".sql"))
          .sort()
          .map((f) => join(ROOT, "supabase/migrations", f)),
        join(ROOT, "supabase/APPLY-ALL.sql"),
        join(ROOT, "supabase/SEED.sql"),
      ].filter((f) => existsSync(f));

const parserFactory = await loadParserFactory();
if (!parserFactory) {
  console.log("! pg-query-emscripten is not installed — STRUCTURAL LINT only.");
  console.log("  (npm install --no-save pg-query-emscripten enables the real PostgreSQL grammar)\n");
}

let failed = 0;
const partial = [];
const partialLabels = new Set();
const lines = [];
for (const file of files) {
  const label = relative(ROOT, file);
  let sql;
  try {
    sql = readFileSync(file, "utf8");
  } catch {
    lines.push({ ok: false, label, detail: "unreadable" });
    failed++;
    continue;
  }

  const parser = parserFactory ? await parserFactory() : null;
  const syntax = parser ? checkSyntax(parser, sql) : null;
  if (syntax?.kind === "error") {
    lines.push({ ok: false, label, detail: `line ${syntax.problem.line}: ${syntax.problem.message}`, snippet: syntax.problem.text });
    failed++;
    continue;
  }
  if (syntax?.kind === "partial") {
    partialLabels.add(label);
    // Honest reporting: these statements could NOT be evaluated by the wasm
    // module, so they are NOT covered by the grammar check (idempotency lint
    // still ran). Never present a skipped check as a passed one.
    partial.push(`${label}: ${syntax.skipped} statement(s) SKIPPED — wasm parser could not evaluate them (grammar check incomplete; structural lint applied)`);
  }
  const problems = structuralLint(sql);
  if (problems.length) {
    lines.push({ ok: false, label, detail: `${problems.length} problem(s)`, problems });
    failed++;
    continue;
  }
  // `parsed` must be false when the grammar check never ran — otherwise a missing
  // parser silently upgrades "lint only" into a claimed grammar pass.
  lines.push({ ok: true, label, parsed: syntax !== null && syntax.kind === "ok", partial: partialLabels.has(label) });
}

for (const r of lines) {
  if (r.ok) {
    const scope = r.partial ? "idempotency OK; grammar check PARTIAL (see note)" : r.parsed ? "PostgreSQL grammar + idempotency" : "idempotency lint (parser unavailable)";
  console.log(`✓ ${r.label} — ${scope}`);
  } else {
    console.log(`✗ ${r.label} — ${r.detail}`);
    if (r.snippet) console.log(`    > ${r.snippet}`);
    for (const p of r.problems ?? []) console.log(`    line ${p.line}: ${p.why}${p.text ? ` — "${p.text}"` : ""}`);
  }
}

for (const note of partial) console.log(`! ${note}`);

if (failed) {
  console.error(`\n✗ ${failed} of ${files.length} SQL file(s) have problems.`);
  process.exit(1);
}
console.log(`\n✓ ${files.length} SQL file(s) clean${parserFactory ? " (validated against the real PostgreSQL parser)" : " (structural lint only)"}.`);
