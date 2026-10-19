import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseHyResourceOptions {
  readonly enabled?: boolean;
}

export function useHyResource<T>(loader: () => Promise<T>, options?: UseHyResourceOptions) {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const inFlightRef = useRef<Promise<T> | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      let promise = inFlightRef.current;
      if (!promise) {
        promise = loader();
        inFlightRef.current = promise;
      }
      const value = await promise;
      if (request === generation.current) {
        setData(value);
      }
    } catch (e) {
      if (request === generation.current) {
        setData(null);
        setError(e instanceof Error ? e.message : 'Chưa tải được dữ liệu. Hãy thử lại.');
      }
    } finally {
      inFlightRef.current = null;
      if (request === generation.current) {
        setLoading(false);
      }
    }
  }, [enabled, loader]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const task = setTimeout(() => void reload(), 0);
    return () => {
      clearTimeout(task);
      generation.current += 1;
      inFlightRef.current = null;
    };
  }, [enabled, reload]);

  return { data, loading: enabled ? loading : false, error, reload };
}
