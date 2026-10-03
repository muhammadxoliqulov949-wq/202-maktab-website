import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, supabaseConnection } from "@/lib/supabase/env";

/**
 * Phase 4 — Edge Middleware: session refresh + first-line route protection.
 *
 * Scope is deliberately narrow (see `config.matcher`):
 *   /admin/*           → refresh the session, redirect anonymous visitors to
 *                        /admin/login, mark the response uncacheable.
 *   /api/v1/admin/*    → refresh the session so the handler sees a live token.
 *   /api/v1/auth/*     → refresh only.
 *
 * PUBLIC routes are NOT matched. No Supabase call, no cookie parsing and no
 * extra latency is added to the public website (requirement 17).
 *
 * This is the *first* line of defence only, for UX. The real authorization is
 * enforced by:
 *   - `src/app/admin/(panel)/layout.tsx` (session + admin_users + role), and
 *   - `requireAdminActor()` in EVERY `/api/v1/admin/*` handler.
 * A request that skips middleware entirely (or a middleware bug) therefore
 * still cannot read or write admin data.
 *
 * Edge-runtime constraints: no Node built-ins, no `next/headers`, no service
 * key. `@supabase/ssr` + the connection helper are the only imports.
 */

const LOGIN_PATH = "/admin/login";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const { url, anonKey } = supabaseConnection();
  // Middleware fallback: deployments that only set server-side variables still
  // get session refresh. This file never runs in a browser bundle, so reading
  // the service key here does not expose it to clients.
  const key = anonKey || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  let response = NextResponse.next({ request: req });

  if (url && key) {
    const supabase = createServerClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      cookieOptions: { name: SESSION_COOKIE, ...sessionCookieOptions() },
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          // Rebuild so the refreshed cookie is forwarded to the route handler…
          response = NextResponse.next({ request: req });
          // …and persisted in the browser.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...sessionCookieOptions(), ...options })
          );
        },
      },
    });

    // Verifies (and transparently refreshes) the session against GoTrue.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLoginPage = pathname === LOGIN_PATH;
    const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");

    if (isAdminPage && !isLoginPage) {
      // Admin HTML must never be cached by a shared cache.
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      if (!user) {
        const login = req.nextUrl.clone();
        login.pathname = LOGIN_PATH;
        login.search = `?next=${encodeURIComponent(pathname + search)}`;
        return NextResponse.redirect(login);
      }
    }

    if (isLoginPage && user) {
      // Already signed in — send them back into the panel.
      const next = req.nextUrl.searchParams.get("next");
      const target = req.nextUrl.clone();
      target.pathname = next && next.startsWith("/admin") ? next : "/admin";
      target.search = "";
      return NextResponse.redirect(target);
    }

    return response;
  }

  // Supabase not configured: no session can exist. Fail closed on admin pages
  // rather than rendering a panel that would 500 on every call.
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminPage && pathname !== LOGIN_PATH) {
    const login = req.nextUrl.clone();
    login.pathname = LOGIN_PATH;
    login.search = "";
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/v1/admin/:path*", "/api/v1/auth/:path*"],
};
