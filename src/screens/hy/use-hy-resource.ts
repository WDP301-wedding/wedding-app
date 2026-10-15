import { useCallback, useEffect, useRef, useState } from 'react';
export function useHyResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const value = await loader();
      if (request === generation.current) setData(value);
    } catch (e) {
      if (request === generation.current) {
        setData(null);
        setError(e instanceof Error ? e.message : 'Chưa tải được dữ liệu. Hãy thử lại.');
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [loader]);
  useEffect(() => {
    const task = setTimeout(() => void reload(), 0);
    return () => {
      clearTimeout(task);
      generation.current += 1;
    };
  }, [reload]);
  return { data, loading, error, reload };
}
