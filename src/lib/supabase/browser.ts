"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * BROWSER Supabase client (Phase 4).
 *
 * Uses only `NEXT_PUBLIC_*` values — the publishable URL + anon key. It can
 * never see `SUPABASE_SERVICE_ROLE_KEY`: that key is resolved exclusively in
 * `./service.ts`, which imports `server-only`.
 *
 * Scope, deliberately narrow:
 *  - The session cookie (`m202_session`) is **HttpOnly**, so browser JS cannot
 *    read the tokens. That is intentional: the app's CSP allows
 *    `script-src 'unsafe-inline'` (Next.js App Router requirement), so a cookie
 *    readable from JS would be an XSS token-theft vector.
 *  - Therefore this client is NOT the source of truth for "am I logged in".
 *    The authoritative check is the same-origin `GET /api/v1/auth/session`
 *    endpoint, which reads the HttpOnly cookie server-side.
 *  - It IS used for Supabase auth lifecycle events (`onAuthStateChange`) so the
 *    admin shell reacts immediately to a sign-out, and it is the single
 *    sanctioned place a browser client may be constructed — no component may
 *    reach for `@supabase/supabase-js` directly.
 *  - No component uses it for database access. The Phase 2/3 rule stands: the
 *    browser talks only to `/api/v1/*`.
 */
let client: SupabaseClient | null = null;

export function createBrowserSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null; // not configured → callers degrade gracefully
  client = createBrowserClient(url, anonKey, {
    auth: {
      // Never write tokens to localStorage: the HttpOnly cookie is the session.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}
