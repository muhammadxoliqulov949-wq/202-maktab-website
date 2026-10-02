import { wrap } from "@/server/http/handler";
import { metrics } from "@/server/observability/metrics";
import { getCache } from "@/server/cache";
import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/errors/AppError";

/** Lightweight per-instance metrics snapshot — gated by METRICS_ENABLED (default off). */
export const GET = wrap("none", () => {
  const env = getEnv();
  if (!env.METRICS_ENABLED) throw AppError.notFound("Not found");

  const cache = getCache().stats();
  return {
    status: 200,
    ttlSec: 0,
    body: {
      success: true,
      data: {
        ...metrics.snapshot(),
        cache,
        queue: { note: "inline provider stats via /api/v1/health/ready" },
      },
      meta: { scope: "process" },
    },
  };
});
