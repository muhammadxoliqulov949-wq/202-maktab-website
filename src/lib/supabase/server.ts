import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions, supabaseConnection } from "@/lib/supabase/env";
import { logger } from "@/server/observability/logger";

/**
 * SERVER Supabase client (Phase 4).
 *
 * Uses the PUBLISHABLE anon apikey — never the service-role key — so every
 * call it makes is subject to Row Level Security and to GoTrue's own auth rate
 * limits. The session lives in an HttpOnly cookie that this module reads and
 * (where the runtime allows) writes back onto the response.
 *
 * Two entry points:
 *  - `createJarSupabase(jar)`   → Route Handlers, where cookies must be applied
 *                                 to the response explicitly (`jar.drain()`).
 *  - `createRequestSupabase()`  → Server Components / Route Handlers that can
 *                                 read `next/headers` cookies.
 */

let warnedAboutServiceKey = false;

/** apikey for auth calls: anon key preferred, service key as a documented fallback. */
export function authApiKey(): string {
  const { anonKey } = supabaseConnection();
  if (anonKey) return anonKey;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (service && !warnedAboutServiceKey) {
    warnedAboutServiceKey = true;
    logger.warn("auth_apikey_fallback", {
      message:
        "SUPABASE_ANON_KEY is not set; falling back to the service-role key for Supabase Auth calls only. Set SUPABASE_ANON_KEY to avoid this.",
    });
  }
  return service;
}

export type JarCookie = { name: string; value: string; options: CookieOptions };

/** Request-scoped cookie store: seeded from the request, drained onto the response. */
export type CookieJar = {
  getAll(): Array<{ name: string; value: string }>;
  set(name: string, value: string, options: CookieOptions): void;
  remove(name: string, options: CookieOptions): void;
  /** Cookies written during this request — attach them to the HTTP response. */
  drain(): JarCookie[];
};

export function createJar(initial: Array<{ name: string; value: string }> = []): CookieJar {
  const current = new Map(initial.map((c) => [c.name, c.value]));
  let written: JarCookie[] = [];
  return {
    getAll: () => Array.from(current, ([name, value]) => ({ name, value })),
    set(name, value, options) {
      current.set(name, value);
      written.push({ name, value, options });
    },
    remove(name, options) {
      current.delete(name);
      written.push({ name, value: "", options: { ...options, maxAge: 0 } });
    },
    drain() {
      const out = written;
      written = [];
      return out;
    },
  };
}

function clientFor(jar: CookieJar): SupabaseClient {
  const { url } = supabaseConnection();
  const opts = sessionCookieOptions();
  return createServerClient(url || "http://supabase.invalid", authApiKey() || "unconfigured", {
    auth: {
      // The cookie jar IS the persistence layer: `persistSession` here means
      // "write the session back through the cookie adapter", which is exactly
      // how a refresh or a fresh sign-in reaches the browser.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    cookieOptions: { name: SESSION_COOKIE, ...opts },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (toSet) => {
        for (const c of toSet) {
          const options = { ...opts, ...(c.options ?? {}) };
          if (c.value === "") jar.remove(c.name, options);
          else jar.set(c.name, c.value, options);
        }
      },
    },
  });
}

/** Route Handlers: cookies come from the request, go onto the response. */
export function createJarSupabase(jar: CookieJar): SupabaseClient {
  return clientFor(jar);
}

/** Server Components / Route Handlers with access to `next/headers`. */
export async function createRequestSupabase(): Promise<{ supabase: SupabaseClient; jar: CookieJar }> {
  const store = await cookies();
  const jar = createJar(store.getAll().map((c) => ({ name: c.name, value: c.value })));
  return { supabase: clientFor(jar), jar };
}

/**
 * A client that speaks to Supabase AS the signed-in administrator (their JWT in
 * the Authorization header) instead of as the service role. Row Level Security
 * therefore decides what it may do — this is what makes the Storage upload
 * policies the real authorization boundary for media.
 */
export function createScopedSupabase(accessToken: string): SupabaseClient {
  const { url } = supabaseConnection();
  return createClient(url || "http://supabase.invalid", authApiKey() || "unconfigured", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Access token from the request's session cookie (no extra network round-trip unless a refresh is needed). */
export async function getUserAccessToken(req: { cookies: { getAll(): Array<{ name: string; value: string }> } }): Promise<string | null> {
  const jar = createJar(req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })));
  const supabase = createJarSupabase(jar);
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Verifies the session against GoTrue over the network — never trusts the JWT
 * payload alone. Returns null when there is no valid session.
 */
export async function getSupabaseUser(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  } catch (err) {
    logger.warn("auth_get_user_failed", { error: err instanceof Error ? err.name : "unknown" });
    return null;
  }
}
