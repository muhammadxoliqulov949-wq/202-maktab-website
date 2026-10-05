#!/usr/bin/env node
/**
 * Secret scanner — working tree + git history.
 *
 * Fails (exit 1) when it finds anything that looks like real key material:
 *   - Supabase JWTs whose payload carries `role: service_role`
 *   - Supabase legacy secret keys (`sb_secret_...`)
 *   - Postgres connection strings with an embedded password
 *   - generic `sk-...` / `ghp_...` / `xoxb-...` style tokens
 *   - long base64 JWTs issued by a Supabase project
 *
 * It prints ONLY the file/commit and the first few characters of a match —
 * never the secret itself.
 *
 * Run: node scripts/check-secrets.mjs   (also wired into CI)
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "out", "build", "coverage", ".turbo", "dist"]);
const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|sql|md|yml|yaml|env|txt|html|css|sh)$/i;

const findings = [];
function report(where, kind, sample) {
  findings.push({ where, kind, sample: sample.slice(0, 12) + "…" });
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function scanText(text, where) {
  // Supabase / generic JWTs
  for (const m of text.matchAll(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g)) {
    const payload = decodeJwtPayload(m[0]);
    const role = payload?.role;
    const iss = payload?.iss ?? "";
    if (role === "service_role" || String(iss).includes("supabase")) {
      report(where, role === "service_role" ? "supabase service_role JWT" : "supabase JWT", m[0]);
    }
  }
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(text)) report(where, "supabase secret key", text.match(/sb_secret_[A-Za-z0-9_-]{20,}/)[0]);
  if (/\bsk-[A-Za-z0-9]{20,}\b/.test(text)) report(where, "sk- style key", text.match(/\bsk-[A-Za-z0-9]{20,}\b/)[0]);
  if (/\bghp_[A-Za-z0-9]{20,}\b/.test(text)) report(where, "github personal access token", text.match(/\bghp_[A-Za-z0-9]{20,}\b/)[0]);
  if (/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/.test(text)) report(where, "slack token", text.match(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/)[0]);
  // postgres://user:password@host
  for (const m of text.matchAll(/\bpostgres(?:ql)?:\/\/[^:\s/]+:([^@\s]{3,})@/g)) {
    report(where, "postgres DSN with password", m[0]);
  }
}

/* ---------------- 1) working tree ---------------- */
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full);
    else if (TEXT_EXT.test(entry) || /^\.env/.test(entry)) {
      if (/package-lock\.json$/.test(full)) continue;
      // The scanner itself contains the detection patterns as literals.
      if (full.endsWith("scripts/check-secrets.mjs")) continue;
      let text;
      try {
        text = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      // A .env.example with EMPTY values is expected and fine.
      if (/^\.env\.example$/.test(entry)) {
        const withValues = text
          .split("\n")
          .filter((l) => /^[A-Z0-9_]+=./.test(l.trim()))
          .join("\n");
        if (withValues) scanText(withValues, `${relative(ROOT, full)} (non-empty value)`);
        continue;
      }
      scanText(text, relative(ROOT, full));
    }
  }
}
walk(ROOT);

/* ---------------- 2) git history ---------------- */
function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return "";
  }
}

const commits = git(["rev-list", "--all", "--max-count=400"]).split("\n").filter(Boolean);
for (const sha of commits) {
  const files = git(["ls-tree", "-r", "--name-only", sha]).split("\n").filter(Boolean);
  for (const file of files) {
    if (!TEXT_EXT.test(file) && !/^\.env/.test(file)) continue;
    if (/package-lock\.json$/.test(file)) continue;
    if (file.endsWith("scripts/check-secrets.mjs")) continue;
    const content = git(["show", `${sha}:${file}`]);
    if (!content) continue;
    const before = findings.length;
    scanText(content, `${file}@${sha.slice(0, 7)}`);
    // One report per file/commit is enough.
    if (findings.length > before) break;
  }
}

/* ---------------- report ---------------- */
if (findings.length) {
  console.error(`✗ ${findings.length} ta potensial maxfiy topilma:\n`);
  for (const f of findings) console.error(`  • [${f.kind}] ${f.where} → ${f.sample}`);
  console.error("\nAgar bu haqiqiy kalit bo'lsa: darhol Supabase dashboard'da rotate qiling va tarixni tozalang.");
  process.exit(1);
}
console.log("✓ Hech qanday kalit material topilmadi (working tree + git history).");
