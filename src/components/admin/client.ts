"use client";

/**
 * Admin API client (browser) — Phase 4.
 *
 *  * Relative URLs only — same origin. No direct database access, ever.
 *  * NO credentials are stored in the browser. The session lives in an
 *    HttpOnly cookie that JavaScript cannot read (the Phase 3 localStorage
 *    dev-token is gone).
 *  * State-changing calls carry the double-submit CSRF token, read from the
 *    non-HttpOnly `m202_csrf` cookie and echoed back in `x-csrf-token`.
 *  * 401 → the session expired: bounce to /admin/login. 403 → surface the
 *    server's message (it is already generic and safe).
 */

const CSRF_COOKIE = "m202_csrf";

export const AUTH_EVENT = "m202-admin-auth-needed";

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : "";
}

export function getCsrfToken(): string {
  return readCookie(CSRF_COOKIE);
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type AdminEnvelope<T> = { success: true; data: T; meta: Record<string, unknown> };

/** Redirect to the login screen, remembering where the user was. */
export function goToLogin(): void {
  if (typeof window === "undefined") return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/admin/login?next=${next}`);
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<AdminEnvelope<T>> {
  const method = (init?.method ?? "GET").toUpperCase();
  const csrf = UNSAFE.has(method) ? getCsrfToken() : "";

  const res = await fetch(path, {
    ...init,
    method,
    credentials: "same-origin",
    headers: {
      // Never set content-type for multipart bodies (the browser adds the boundary).
      ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(csrf ? { "x-csrf-token": csrf } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: 401 }));
    goToLogin();
    throw new Error("Sessiya tugagan — qaytadan kiring.");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    const message = body?.error?.message ?? `Server xatosi (${res.status})`;
    if (body?.error?.details) {
      const fields = (body.error.details as Array<{ field: string; message: string }>).map((d) => `${d.field}: ${d.message}`).join("; ");
      throw new Error(`${message} — ${fields}`);
    }
    throw new Error(message);
  }
  return body as AdminEnvelope<T>;
}

/** POST /api/v1/auth/logout then back to the login screen. */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-token": getCsrfToken() },
    });
  } finally {
    if (typeof window !== "undefined") window.location.assign("/admin/login");
  }
}

export const fmtDate = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtDateOnly = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
