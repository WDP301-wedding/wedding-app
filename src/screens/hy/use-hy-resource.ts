import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchWithDeduplication,
  resourcePolicy,
  ResourceSupersededError,
  sharedResourceStore,
} from './resource-store';
export interface UseHyResourceOptions {
  readonly enabled?: boolean | undefined;
  readonly key?: string | undefined;
  readonly ttlMs?: number | undefined;
}
export function useHyResource<T>(loader: () => Promise<T>, options?: UseHyResourceOptions) {
  const enabled = options?.enabled ?? true;
  const resourceKey = options?.key;
  const ttlMs = options?.ttlMs ?? resourcePolicy.defaultTtlMs;
  const [state, setState] = useState<{
    key: string | undefined;
    data: T | null;
    loading: boolean;
    error: string | null;
  }>(() => ({
    key: resourceKey,
    data: resourceKey ? sharedResourceStore.get<T>(resourceKey) : null,
    loading: enabled && (!resourceKey || sharedResourceStore.get<T>(resourceKey) === null),
    error: null,
  }));
  const generation = useRef(0);
  const inFlight = useRef<Promise<T> | null>(null);
  const reload = useCallback(
    async (force = true) => {
      if (!enabled) return;
      const request = ++generation.current;
      setState((previous) => ({
        key: resourceKey,
        data: previous.key === resourceKey ? previous.data : null,
        loading: true,
        error: null,
      }));
      let promise: Promise<T> | null = null;
      try {
        promise = resourceKey
          ? fetchWithDeduplication(resourceKey, loader, { ttlMs, force })
          : (inFlight.current ?? Promise.resolve().then(loader));
        if (!resourceKey) inFlight.current = promise;
        const data = await promise;
        if (request === generation.current)
          setState({ key: resourceKey, data, loading: false, error: null });
      } catch (error) {
        if (request === generation.current)
          setState((previous) => ({
            ...previous,
            loading: false,
            error:
              error instanceof ResourceSupersededError
                ? null
                : error instanceof Error
                  ? error.message
                  : 'Chưa tải được dữ liệu. Hãy thử lại.',
          }));
      } finally {
        if (promise && inFlight.current === promise) inFlight.current = null;
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
      inFlight.current = null;
    };
  }, [enabled, reload]);
  const sameResource = state.key === resourceKey;
  return {
    data: sameResource ? state.data : resourceKey ? sharedResourceStore.get<T>(resourceKey) : null,
    loading: enabled && (!sameResource || state.loading),
    error: sameResource ? state.error : null,
    reload,
  };
}
