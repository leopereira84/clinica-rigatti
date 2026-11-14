import { useCallback, useEffect, useState } from 'react';
import { isAbortError } from './api';

interface QueryState<T> {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
}

export interface QueryResult<T> extends QueryState<T> {
  reload: () => void;
}

/**
 * Minimal data-loading hook. Re-runs whenever `key` changes, cancels the
 * previous request, and keeps the last data while reloading so lists do not
 * flash empty between filter changes.
 */
export function useQuery<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>): QueryResult<T> {
  const [state, setState] = useState<QueryState<T>>({ data: undefined, error: undefined, isLoading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, error: undefined, isLoading: true }));

    fetcher(controller.signal)
      .then((data) => setState({ data, error: undefined, isLoading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setState((previous) => ({ data: previous.data, error, isLoading: false }));
      });

    return () => controller.abort();
    // The fetcher is intentionally keyed by `key`: callers encode its inputs there.
  }, [key, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { ...state, reload };
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
