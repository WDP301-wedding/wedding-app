export const resourcePolicy = {
  defaultTtlMs: 30_000,
  bookingTtlMs: 60_000,
  catalogTtlMs: 300_000,
  maxEntries: 100,
} as const;
interface CacheEntry {
  data: unknown;
  cachedAt: number;
  ttlMs: number;
}
interface Flight {
  promise: Promise<unknown>;
  forced: boolean;
}
/** A discarded request must never publish data to a new resource/session generation. */
export class ResourceSupersededError extends Error {
  constructor() {
    super('Resource request was superseded.');
    this.name = 'ResourceSupersededError';
  }
}
class ResourceStore {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Flight>();
  private scope: string | null = null;
  setScope(scope: string): void {
    if (scope === this.scope) return;
    this.clear();
    this.scope = scope;
  }
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt >= entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }
  set<T>(key: string, data: T, ttlMs: number = resourcePolicy.defaultTtlMs): void {
    if (data === null || data === undefined || ttlMs <= 0) return;
    this.cache.delete(key);
    if (this.cache.size >= resourcePolicy.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, cachedAt: Date.now(), ttlMs });
  }
  invalidate(pattern?: string | RegExp): void {
    const keys = new Set([...this.cache.keys(), ...this.inFlight.keys()]);
    for (const key of keys) {
      if (pattern instanceof RegExp) pattern.lastIndex = 0;
      if (!pattern || (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key))) {
        this.cache.delete(key);
        this.inFlight.delete(key);
      }
    }
  }
  fetchWithDeduplication<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = resourcePolicy.defaultTtlMs,
    force = false,
  ): Promise<T> {
    if (!force) {
      const cached = this.get<T>(key);
      if (cached !== null) return Promise.resolve(cached);
    }
    const current = this.inFlight.get(key);
    if (current && (!force || current.forced)) return current.promise as Promise<T>;
    const flight: Flight = { promise: Promise.resolve(), forced: force };
    // Deferral installs ownership before even a synchronous fetcher can settle/throw.
    const promise = Promise.resolve()
      .then(fetcher)
      .then((data) => {
        if (this.inFlight.get(key) !== flight) throw new ResourceSupersededError();
        this.set(key, data, ttlMs);
        return data;
      })
      .finally(() => {
        if (this.inFlight.get(key) === flight) this.inFlight.delete(key);
      });
    flight.promise = promise;
    this.inFlight.set(key, flight);
    return promise;
  }
  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}
export const sharedResourceStore = new ResourceStore();
export function fetchWithDeduplication<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; force?: boolean },
): Promise<T> {
  return sharedResourceStore.fetchWithDeduplication(key, fetcher, options?.ttlMs, options?.force);
}
