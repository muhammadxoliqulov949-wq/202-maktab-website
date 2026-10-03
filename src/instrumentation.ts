/**
 * Next.js instrumentation hook — runs once per server process at boot.
 * Validates environment configuration early (fail fast).
 *
 * IMPORTANT (Phase 4): adding `src/middleware.ts` makes Next.js compile an EDGE
 * variant of this file as well. This module therefore imports NOTHING that
 * pulls in Node built-ins — no repositories, no services, no `node:*`. Anything
 * heavier is registered lazily by the route that needs it (for example
 * `registerContactQueueHandler()` is called from the contact route itself, and
 * is idempotent per process).
 *
 * The body is additionally guarded by `NEXT_RUNTIME` so the edge process never
 * performs Node-only work.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getEnv } = await import("@/server/config/env");
  const { logger } = await import("@/server/observability/logger");

  try {
    const env = getEnv();
    logger.info("data_provider", { provider: env.DATA_PROVIDER });
    logger.info("server_boot", {
      nodeEnv: env.NODE_ENV,
      cacheProvider: env.CACHE_PROVIDER,
      dataProvider: env.DATA_PROVIDER,
      spamFilter: env.SPAM_FILTER,
      logLevel: env.LOG_LEVEL,
      supabaseConfigured: Boolean(env.SUPABASE_URL),
      anonKeyConfigured: Boolean(env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    });
  } catch (err) {
    // Crash the process at startup — misconfiguration must never serve traffic.
    const { logger } = await import("@/server/observability/logger");
    logger.error("server_boot_failed", { error: String(err) });
    throw err;
  }
}
