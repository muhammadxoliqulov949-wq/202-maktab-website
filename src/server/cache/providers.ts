/** Cache provider abstraction — Phase 2: memory; Phase 3: Redis adapter (optional). */

export type CacheEntry<T> = { hit: boolean; value?: T };

export interface CacheProvider {
  get<T>(key: string): Promise<CacheEntry<T>>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Delete all keys starting with the prefix (used by invalidation). */
  delByPrefix(prefix: string): Promise<number>;
  stats(): { hits: number; misses: number; size: number };
}

/** In-process memory cache. An optimization only — never the source of truth. */
export class MemoryCacheProvider implements CacheProvider {
  private store = new Map<string, { value: unknown; expiresAt: number }>();
  private hits = 0;
  private misses = 0;

  async get<T>(key: string): Promise<CacheEntry<T>> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return { hit: false };
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return { hit: false };
    }
    this.hits++;
    return { hit: true, value: entry.value as T };
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (this.store.size > 5_000) this.sweep();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<number> {
    let n = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        n++;
      }
    }
    return n;
  }

  stats() {
    return { hits: this.hits, misses: this.misses, size: this.store.size };
  }

  private sweep() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

/**
 * Redis adapter placeholder (Phase 3). Not installed in Phase 2 — selecting
 * `CACHE_PROVIDER=redis` without the dependency logs a warning and falls back
 * to memory so the app never depends on optional infrastructure to boot.
 */
export class RedisCacheProvider implements CacheProvider {
  constructor() {
    throw new Error(
      "RedisCacheProvider requires the `ioredis` dependency (planned for Phase 3). Install it and implement the adapter."
    );
  }
  get<T>(): Promise<CacheEntry<T>> {
    return Promise.resolve({ hit: false });
  }
  set(): Promise<void> {
    return Promise.resolve();
  }
  del(): Promise<void> {
    return Promise.resolve();
  }
  async delByPrefix(): Promise<number> {
    return 0;
  }
  stats() {
    return { hits: 0, misses: 0, size: 0 };
  }
}
