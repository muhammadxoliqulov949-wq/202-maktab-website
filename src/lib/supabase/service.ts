import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/server/config/env";

/**
 * SERVICE-ROLE Supabase client (Phase 4 naming; Phase 3 behaviour preserved).
 *
 *  * `import "server-only"` turns any accidental client-bundle import into a
 *    BUILD ERROR — the service-role key must never reach the browser.
 *  * The key is read from `SUPABASE_SERVICE_ROLE_KEY` only. It is never
 *    referenced through a `NEXT_PUBLIC_*` name and never logged.
 *  * Created once per process (Supabase's REST gateway pools connections).
 *  * `persistSession`/`autoRefreshToken` are off: this is a server-to-service
 *    client, not a user session.
 *
 * This client BYPASSES Row Level Security. Every use is justified in
 * docs/AUTH.md §2.1 — in short: public content has no anon policies (the API
 * layer enforces draft/archive separation), and the private tables
 * (contact_submissions, admin_audit_logs, admin_users, media_assets) must stay
 * unreadable to every PostgREST role except this one.
 */
let client: SupabaseClient | null = null;

export function supabaseService(): SupabaseClient {
  if (client) return client;
  const env = getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    // Never include key material in this message.
    throw new Error("Supabase is not configured (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required)");
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Test/worker helper — drops the cached client (never exposes it). */
export function resetSupabaseServiceClient(): void {
  client = null;
}
