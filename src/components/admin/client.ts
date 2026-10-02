"use client";

/**
 * Admin API client (browser).
 *  * Relative URLs only — same origin, no direct database access (by design).
 *  * Dev token kept in localStorage; 401/503 opens the token prompt.
 *  * NOTE: this token gate is DEVELOPMENT ONLY — Phase 4 adds real auth.
 */

const TOKEN_KEY = "m202-admin-dev-token";

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string): void {
  if (token.trim()) window.localStorage.setItem(TOKEN_KEY, token.trim());
  else window.localStorage.removeItem(TOKEN_KEY);
}

export const AUTH_EVENT = "m202-admin-auth-needed";

export type AdminEnvelope<T> = { success: true; data: T; meta: Record<string, unknown> };

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<AdminEnvelope<T>> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { "x-admin-dev-token": token } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 || res.status === 503) {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: res.status }));
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Ruxsat yo'q — admin kaliti kerak");
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

export const fmtDate = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtDateOnly = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
