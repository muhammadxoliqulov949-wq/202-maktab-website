/**
 * Lightweight in-process metrics registry.
 * Production monitoring (Prometheus/OTLP) can adapt on top of snapshot() later.
 * Phase 2 scope: counters + coarse latency quantiles. No heavy monitoring stack.
 */

type Counters = Map<string, number>;

class MetricsRegistry {
  private counters: Counters = new Map();
  private durations: number[] = [];
  private readonly maxSamples = 2_000;
  startedAt = Date.now();

  increment(name: string, by = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by);
  }

  observeDuration(ms: number): void {
    this.durations.push(ms);
    if (this.durations.length > this.maxSamples) this.durations.shift();
  }

  quantile(q: number): number | null {
    if (this.durations.length === 0) return null;
    const sorted = [...this.durations].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
    return Math.round(sorted[idx]! * 100) / 100;
  }

  snapshot() {
    const s = {
      uptimeSec: Math.round((Date.now() - this.startedAt) / 1000),
      counters: Object.fromEntries(this.counters),
      latencyMs: {
        p50: this.quantile(0.5),
        p95: this.quantile(0.95),
        p99: this.quantile(0.99),
      },
    };
    return s;
  }
}

/** One registry per process — acceptable for Phase 2 (per-instance observability). */
const g = globalThis as unknown as { __m202Metrics?: MetricsRegistry };
export const metrics: MetricsRegistry = g.__m202Metrics ?? new MetricsRegistry();
g.__m202Metrics = metrics;
