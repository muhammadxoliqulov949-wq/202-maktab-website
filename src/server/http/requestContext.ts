import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped bag for things a handler discovers but cannot return through
 * the controller signature — currently the `Set-Cookie` headers produced by a
 * Supabase session refresh or by login/logout.
 *
 * `wrap()` opens a scope around every route invocation and drains it onto the
 * response (including error responses), so controllers stay free of cookie
 * plumbing.
 *
 * Node runtime only (no route in this app opts into the edge runtime).
 */
export type ResponseCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

type Scope = { cookies: ResponseCookie[] };

const storage = new AsyncLocalStorage<Scope>();

export type RequestScope = {
  /** Run `fn` inside this scope. */
  run<T>(fn: () => Promise<T> | T): Promise<T> | T;
  /** Take (and clear) everything queued so far — safe to call after a throw. */
  drain(): ResponseCookie[];
};

export function createRequestScope(): RequestScope {
  const scope: Scope = { cookies: [] };
  return {
    run: (fn) => storage.run(scope, fn),
    drain: () => {
      const out = scope.cookies;
      scope.cookies = [];
      return out;
    },
  };
}

/** Queue a cookie for the current response (no-op outside a request scope). */
export function queueResponseCookie(cookie: ResponseCookie): void {
  storage.getStore()?.cookies.push(cookie);
}

export function queueResponseCookies(cookies: ResponseCookie[]): void {
  const scope = storage.getStore();
  if (!scope) return;
  for (const c of cookies) scope.cookies.push(c);
}
