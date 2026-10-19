import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithDeduplication, sharedResourceStore } from './resource-store';

export interface UseHyResourceOptions {
  readonly enabled?: boolean | undefined;
  readonly key?: string | undefined;
  readonly ttlMs?: number | undefined;
}

export function useHyResource<T>(loader: () => Promise<T>, options?: UseHyResourceOptions) {
  const enabled = options?.enabled ?? true;
  const resourceKey = options?.key;
  const ttlMs = options?.ttlMs ?? 30_000;

  const [data, setData] = useState<T | null>(() => {
    if (resourceKey) {
      return sharedResourceStore.get<T>(resourceKey);
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!enabled) return false;
    if (resourceKey && sharedResourceStore.get<T>(resourceKey) !== null) {
      return false;
    }
    return true;
  });

  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const inFlightRef = useRef<Promise<T> | null>(null);
  const prevKeyRef = useRef(resourceKey);

  // Synchronously switch cached data if resourceKey changes to avoid showing previous booking
  if (prevKeyRef.current !== resourceKey) {
    prevKeyRef.current = resourceKey;
    const cached = resourceKey ? sharedResourceStore.get<T>(resourceKey) : null;
    setData(cached);
    if (cached !== null) {
      setLoading(false);
      setError(null);
    }
  }

  const reload = useCallback(
    async (force: boolean = false) => {
      if (!enabled) return;
      const request = ++generation.current;
      const hasCached = resourceKey ? sharedResourceStore.get<T>(resourceKey) !== null : false;
      if (!hasCached || force) {
        setLoading(true);
      }
      setError(null);
      try {
        let promise: Promise<T>;
        if (resourceKey) {
          promise = fetchWithDeduplication(resourceKey, loader, { ttlMs, force });
        } else {
          promise = inFlightRef.current ?? loader();
          inFlightRef.current = promise;
        }

        const value = await promise;
        if (request === generation.current) {
          setData(value);
          setError(null);
        }
      } catch (e) {
        if (request === generation.current) {
          if (!hasCached) {
            setData(null);
          }
          setError(e instanceof Error ? e.message : 'Chưa tải được dữ liệu. Hãy thử lại.');
        }
      } finally {
        if (inFlightRef.current) {
          inFlightRef.current = null;
        }
        if (request === generation.current) {
          setLoading(false);
        }
      }
    },
    [enabled, loader, resourceKey, ttlMs],
  );

  useEffect(() => {
    if (!enabled) return;
    const task = setTimeout(() => void reload(false), 0);
    return () => {
      clearTimeout(task);
      generation.current += 1;
    };
  }, [enabled, reload]);

  return { data, loading: enabled ? loading : false, error, reload };
}
