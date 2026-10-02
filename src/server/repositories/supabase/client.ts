import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/server/config/env";

/**
 * SERVER-ONLY Supabase client factory (service role).
 *
 *  * `import "server-only"` makes any accidental client-bundle import a
 *    build-time error — the service-role key must never reach the browser.
 *  * The client is created once per process (connection pooling is handled
 *    by Supabase's REST gateway; no per-request clients).
 *  * persistSession/autoRefreshToken are off: this is a server-to-service
 *    client, not a browser session.
 */
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const env = getEnv();
  if (env.DATA_PROVIDER !== "supabase" || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    // Never include key material in this message.
    throw new Error("Supabase is not configured (DATA_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)");
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Test/worker helper — drops the cached client (never exposes it). */
export function resetSupabaseClient(): void {
  client = null;
}
