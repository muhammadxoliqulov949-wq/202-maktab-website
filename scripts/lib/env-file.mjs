/**
 * Minimal .env loader for the operator CLIs (scripts/admin-user.mjs,
 * scripts/apply-migration.mjs, scripts/verify-supabase.mjs).
 *
 * Why this exists: Next.js loads `.env.local` for `next dev|build|start`, and
 * this repo's docs (.env.example, supabase/README.md, docs/AUTH.md §6) tell the
 * operator to put SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY there. The standalone
 * CLIs read `process.env` directly, so an operator who followed the docs got
 * "SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY … kerak" and had no way to tell a
 * broken tool from a missing key. These scripts now resolve the same file Next
 * would — with the same precedence.
 *
 * Deliberately dependency-free and deliberately narrow:
 *  - only the variable names the caller lists are imported, so a stray
 *    unrelated assignment in the file cannot change program behaviour;
 *  - an already-set (and non-empty) environment variable always wins, so CI
 *    secrets and explicit `export`s are never overridden;
 *  - values are NEVER returned or printed — the caller only gets "NAME" strings
 *    for a "loaded from file" note.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Parse dotenv-style text. Handles `export KEY=value`, `#` comments, blank lines
 * and one layer of matching single/double quotes. No shell expansion, no
 * multi-line values — this file exists to read two credentials, not to be a
 * shell.
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseEnvFile(text) {
  const out = {};
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const body = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = body.indexOf("=");
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = body.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.length > 1 && value.endsWith(quote)) {
      value = value.slice(1, -1);
    } else {
      // strip a trailing inline comment only in the unquoted case
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    if (value === "") continue; // empty means "unset", not "override with nothing"
    out[key] = value;
  }
  return out;
}

/**
 * Loads the first matching keys from the given files, in order.
 * @param {string} root directory to look in (usually process.cwd())
 * @param {{files?: string[], allow?: Set<string>}} [options]
 * @returns {{loaded: string[], file: string|null}} names only — never values
 */
export function loadEnvFiles(root = process.cwd(), { files = [".env.local", ".env"], allow = null } = {}) {
  const loaded = [];
  let fromFile = null;

  for (const file of files) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    let parsed;
    try {
      parsed = parseEnvFile(readFileSync(path, "utf8"));
    } catch {
      continue; // an unreadable file must not break the command
    }
    fromFile ??= file;
    for (const [key, value] of Object.entries(parsed)) {
      if (allow && !allow.has(key)) continue;
      const current = process.env[key];
      if (current !== undefined && current !== "") continue; // env wins over file
      process.env[key] = value;
      loaded.push(key);
    }
  }

  return { loaded, file: fromFile };
}
