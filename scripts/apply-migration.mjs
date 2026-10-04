#!/usr/bin/env node
/**
 * Apply Supabase migrations through the Management API.
 *
 *   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... node scripts/apply-migration.mjs [file ...]
 *   npm run db:migrate:apply            # applies every migrations/*.sql in order
 *
 * Every migration in this repository is written to be IDEMPOTENT, so re-running
 * is safe. Without a token this script only prints what you need to paste into
 * the Supabase SQL Editor — it never guesses credentials.
 *
 * The token is never printed.
 */
import { readdirSync, readFileSync } from "node:fs";
import { loadEnvFiles } from "./lib/env-file.mjs";

// Same resolution order as the other operator CLIs: explicit env, then .env.local.
const envFrom = loadEnvFiles(process.cwd(), {
  allow: new Set(["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]),
});
if (envFrom.loaded.length) console.log(`· ${envFrom.file}: ${envFrom.loaded.join(", ")} o'qildi (qiymatlar chop etilmaydi)`);

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const dir = new URL("../supabase/migrations/", import.meta.url);

const files = (process.argv.length > 2 ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith(".sql")).sort());

if (!TOKEN || !REF) {
  console.log("SUPABASE_ACCESS_TOKEN va/yoki SUPABASE_PROJECT_REF berilmagan.\n");
  console.log("Qo'lda qo'llash (Supabase dashboard → SQL Editor), tartib bilan:");
  for (const f of files) console.log(`  supabase/migrations/${f}`);
  console.log("\nHar bir fayl idempotent — qayta ishga tushirish xavfsiz.");
  process.exit(0);
}

let failed = 0;
for (const file of files) {
  const sql = readFileSync(new URL(file, dir), "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (res.ok) {
    console.log(`✓ ${file}`);
  } else {
    failed++;
    const text = await res.text();
    console.error(`✗ ${file} — HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

if (failed) {
  console.error(`\n${failed} ta migratsiya qo'llanmadi.`);
  process.exit(1);
}
console.log("\n✓ Barcha migratsiyalar qo'llandi.");
