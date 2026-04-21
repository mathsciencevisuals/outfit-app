import { useEffect, useState } from "react";

export function useAsyncResource<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    loader()
      .then((nextData) => {
        if (mounted) {
          setData(nextData);
          setError(null);
        }
      })
      .catch((nextError: Error) => {
        if (mounted) {
          setError(nextError.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, deps);

  return { data, loading, error };
}
