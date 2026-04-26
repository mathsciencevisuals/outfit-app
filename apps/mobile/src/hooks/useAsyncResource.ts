import { useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches an async resource on mount and whenever `deps` change.
 * Cancels in-flight requests on unmount / dep change (via mounted flag).
 * Exposes `refetch()` to manually re-trigger.
 */
export function useAsyncResource<T>(
  loader: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  // Keep a stable ref to the latest loader so the effect closure is always fresh
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    loaderRef.current()
      .then((next) => { if (mounted) { setData(next); setError(null); } })
      .catch((e: Error) => { if (mounted) setError(e.message); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = () => setTick((t) => t + 1);

  return { data, loading, error, refetch };
}
