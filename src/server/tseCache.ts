export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
  staleTtlMs: number;
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
  inFlightRequests: number;
  defaultTtlMs: number;
  defaultStaleTtlMs: number;
}

export interface TseMemoryCacheOptions {
  defaultTtlMs?: number;
  defaultStaleTtlMs?: number;
  maxEntries?: number;
}

export class TseMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();

  private defaultTtlMs: number;
  private defaultStaleTtlMs: number;
  private maxEntries: number;

  private stats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    evictions: 0,
  };

  constructor(options: TseMemoryCacheOptions = {}) {
    const rawTtl = options.defaultTtlMs ?? parseInt(process.env.TSE_CACHE_TTL_MS || '15000', 10);
    this.defaultTtlMs = Math.max(10, isNaN(rawTtl) ? 15000 : rawTtl);

    const rawStaleTtl = options.defaultStaleTtlMs ?? parseInt(process.env.TSE_CACHE_STALE_TTL_MS || '60000', 10);
    const parsedStaleTtl = Math.max(10, isNaN(rawStaleTtl) ? 60000 : rawStaleTtl);
    this.defaultStaleTtlMs = Math.max(this.defaultTtlMs, parsedStaleTtl);

    const rawMax = options.maxEntries ?? parseInt(process.env.TSE_CACHE_MAX_ENTRIES || '300', 10);
    this.maxEntries = Math.max(1, isNaN(rawMax) ? 300 : rawMax);
  }

  /**
   * Reads an item from cache.
   * Returns { data, isStale } if valid or within stale window.
   * Evicts if expired past stale window.
   */
  public get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const age = Date.now() - entry.timestamp;

    if (age <= entry.ttlMs) {
      this.stats.hits++;
      // Touch for LRU ordering
      this.cache.delete(key);
      this.cache.set(key, entry);
      return { data: entry.data, isStale: false };
    }

    if (age <= entry.staleTtlMs) {
      this.stats.staleHits++;
      // Touch for LRU ordering
      this.cache.delete(key);
      this.cache.set(key, entry);
      return { data: entry.data, isStale: true };
    }

    // Expired past stale threshold
    this.cache.delete(key);
    this.stats.evictions++;
    this.stats.misses++;
    return null;
  }

  /**
   * Sets an item into cache with LRU eviction when exceeding maxEntries.
   */
  public set<T>(key: string, data: T, ttlMs?: number, staleTtlMs?: number): void {
    const ttl = Math.max(10, ttlMs ?? this.defaultTtlMs);
    const requestedStale = staleTtlMs ?? this.defaultStaleTtlMs;
    const staleTtl = Math.max(ttl, requestedStale);

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry (first key in map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs: ttl,
      staleTtlMs: staleTtl,
    });
  }

  /**
   * Fetches data using Stale-While-Revalidate and In-Flight Request Deduplication.
   * - If fresh: returns cached data immediately.
   * - If stale: returns stale data immediately and triggers background revalidation.
   * - If missing: coalesces in-flight requests and fetches fresh data.
   * - If external fetch fails but stale data exists: falls back to stale data safely.
   */
  public async fetchWithStaleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttlMs?: number; staleTtlMs?: number }
  ): Promise<{ data: T; fromCache: boolean; isStale: boolean }> {
    const cached = this.get<T>(key);

    if (cached) {
      if (!cached.isStale) {
        return { data: cached.data, fromCache: true, isStale: false };
      }

      // Entry is stale: trigger background revalidation without blocking caller
      this.revalidateInBackground(key, fetcher, options);
      return { data: cached.data, fromCache: true, isStale: true };
    }

    // Cache miss: check if an identical fetch is already in-flight (including background revalidation)
    let existingPromise = this.inFlight.get(key) as Promise<T> | undefined;

    if (!existingPromise) {
      existingPromise = (async () => {
        try {
          const freshData = await fetcher();
          this.set(key, freshData, options?.ttlMs, options?.staleTtlMs);
          return freshData;
        } catch (err) {
          // As a last-resort fallback, if we have an older entry in cache, return it
          const fallback = this.cache.get(key) as CacheEntry<T> | undefined;
          if (fallback) {
            return fallback.data;
          }
          throw err;
        } finally {
          this.inFlight.delete(key);
        }
      })();

      this.inFlight.set(key, existingPromise);
    }

    const data = await existingPromise;
    return { data, fromCache: false, isStale: false };
  }

  /**
   * Triggers background revalidation if not already in-flight.
   * Returns Promise<T> so that concurrent callers awaiting this key receive valid data.
   */
  private revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttlMs?: number; staleTtlMs?: number }
  ): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const bgPromise = (async (): Promise<T> => {
      try {
        const freshData = await fetcher();
        this.set(key, freshData, options?.ttlMs, options?.staleTtlMs);
        return freshData;
      } catch (err) {
        console.warn(`[TseMemoryCache] Background revalidation failed for ${key}:`, err instanceof Error ? err.message : err);
        const fallback = this.cache.get(key) as CacheEntry<T> | undefined;
        if (fallback) return fallback.data;
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, bgPromise);
    // Attach error handler to prevent unhandled rejection in background execution
    bgPromise.catch(() => {});
    return bgPromise;
  }

  public invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  public getStats(): CacheStats {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      staleHits: this.stats.staleHits,
      evictions: this.stats.evictions,
      inFlightRequests: this.inFlight.size,
      defaultTtlMs: this.defaultTtlMs,
      defaultStaleTtlMs: this.defaultStaleTtlMs,
    };
  }
}

export const globalTseCache = new TseMemoryCache();
