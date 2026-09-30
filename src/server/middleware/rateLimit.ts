import { getEnv, type Env } from "@/server/config/env";

/**
 * Rate-limit abstraction.
 * Phase 2: in-process fixed-window limiter (per API instance).
 * Phase 3+: swap in a Redis/distributed limiter via the same interface so
 * instances behind a load balancer share limits.
 * NOTE: per-instance memory limits multiply by replica count until then.
 */

export type RatePolicyName = "publicRead" | "search" | "contact" | "auth" | "admin";

export type RateCheckResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

export interface RateLimiter {
  check(policy: RatePolicyName, key: string): RateCheckResult;
}

type Bucket = { count: number; resetAt: number };

export class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();

  check(policy: RatePolicyName, key: string): RateCheckResult {
    const { limit, windowMs } = policyConfig(getEnv())[policy];
    const now = Date.now();
    const bucketKey = `${policy}:${key}`;

    let bucket = this.buckets.get(bucketKey);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(bucketKey, bucket);
    }

    bucket.count++;
    const allowed = bucket.count <= limit;
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    // occasional cleanup to avoid unbounded keys
    if (this.buckets.size > 10_000) {
      for (const [k, b] of this.buckets) if (now >= b.resetAt) this.buckets.delete(k);
    }

    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSec,
    };
  }
}

export function policyConfig(env: Env): Record<RatePolicyName, { limit: number; windowMs: number }> {
  return {
    publicRead: { limit: env.RATE_LIMIT_PUBLIC_READ_MAX, windowMs: env.RATE_LIMIT_PUBLIC_READ_WINDOW_MS },
    search: { limit: env.RATE_LIMIT_SEARCH_MAX, windowMs: env.RATE_LIMIT_SEARCH_WINDOW_MS },
    contact: { limit: env.RATE_LIMIT_CONTACT_MAX, windowMs: env.RATE_LIMIT_CONTACT_WINDOW_MS },
    // reserved policies for later phases — configured now, applied later
    auth: { limit: 10, windowMs: 60_000 },
    admin: { limit: 30, windowMs: 60_000 },
  };
}

let limiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!limiter) limiter = new MemoryRateLimiter();
  return limiter;
}

/** Best-effort client identity for rate limiting (proxy-aware, never logged raw). */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}
