/**
 * Phase 4 — Supabase connection settings.
 *
 * Edge-safe on purpose: this module is imported by `src/middleware.ts`, so it
 * must not pull in `server-only`, `next/headers`, zod or any Node API.
 *
 * Only the PUBLISHABLE values are resolved here. The service-role key is
 * resolved exclusively in `./service.ts`, which is guarded by `server-only`.
 */
export type SupabaseConnection = {
  url: string;
  /** publishable / anon apikey — safe to send from any runtime */
  anonKey: string;
  /** false when the project is not configured (auth then degrades to "no session") */
  configured: boolean;
};

let warned = false;

/** First non-empty value. Next inlines `NEXT_PUBLIC_*` at build time and may
 *  substitute an empty string, so `??` alone is not enough. */
function firstSet(...values: Array<string | undefined>): string {
  for (const v of values) {
    const s = (v ?? "").trim();
    if (s) return s;
  }
  return "";
}

export function supabaseConnection(): SupabaseConnection {
  const url = firstSet(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL);
  const anonKey = firstSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, process.env.SUPABASE_ANON_KEY);
  const configured = Boolean(url && anonKey);
  if (!configured && !warned) {
    warned = true;
    // Never print the values themselves.
    console.warn(
      "[auth] Supabase Auth is not configured (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_ANON_KEY missing) — admin sessions will be unavailable."
    );
  }
  return { url, anonKey, configured };
}

/** Name of the HttpOnly cookie that carries the Supabase session. */
export const SESSION_COOKIE = "m202_session";
/** Name of the readable double-submit CSRF cookie. */
export const CSRF_COOKIE = "m202_csrf";

export function sessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    // `Secure` in production: the panel must be served over HTTPS.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Bounded browser lifetime; the real expiry is enforced by GoTrue.
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function csrfCookieOptions(): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    // Readable by JS by design — that is what makes double-submit work.
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
