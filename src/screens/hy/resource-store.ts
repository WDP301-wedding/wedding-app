interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

interface InFlightEntry<T> {
  promise: Promise<T>;
  startedAt: number;
}

class ResourceStore {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, InFlightEntry<unknown>>();
  private readonly maxEntries = 100;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs: number = 30_000): void {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, cachedAt: Date.now(), ttlMs });
  }

  getInFlight<T>(key: string): Promise<T> | null {
    const entry = this.inFlight.get(key);
    return entry ? (entry.promise as Promise<T>) : null;
  }

  setInFlight<T>(key: string, promise: Promise<T>): void {
    this.inFlight.set(key, { promise: promise as Promise<unknown>, startedAt: Date.now() });
  }

  clearInFlight(key: string, expectedPromise: Promise<unknown>): void {
    const current = this.inFlight.get(key);
    if (current && current.promise === expectedPromise) {
      this.inFlight.delete(key);
    }
  }

  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of Array.from(this.cache.keys())) {
      if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async fetchWithDeduplication<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 30_000,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const existingPromise = this.getInFlight<T>(key);
    if (existingPromise !== null) return existingPromise;

    let opPromise!: Promise<T>;
    opPromise = (async () => {
      try {
        const data = await fetcher();
        this.set(key, data, ttlMs);
        return data;
      } finally {
        this.clearInFlight(key, opPromise);
      }
    })();

    this.setInFlight(key, opPromise);
    return opPromise;
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
  return sharedResourceStore.fetchWithDeduplication(key, fetcher, options?.ttlMs);
}
