/**
 * Next.js instrumentation hook — runs once per server process at boot.
 * Validates environment configuration early (fail fast) and registers
 * queue processors so no task is ever enqueued without a handler.
 */
export async function register() {
  const { getEnv } = await import("@/server/config/env");
  const { logger } = await import("@/server/observability/logger");
  const { registerContactQueueHandler } = await import("@/server/services/contact.service");
  const { logDataProvider } = await import("@/server/repositories");

  try {
    const env = getEnv();
    registerContactQueueHandler();
    logDataProvider();
    logger.info("server_boot", {
      nodeEnv: env.NODE_ENV,
      cacheProvider: env.CACHE_PROVIDER,
      dataProvider: env.DATA_PROVIDER,
      spamFilter: env.SPAM_FILTER,
      logLevel: env.LOG_LEVEL,
    });
  } catch (err) {
    // Crash the process at startup — misconfiguration must never serve traffic.
    logger.error("server_boot_failed", { error: String(err) });
    throw err;
  }
}
