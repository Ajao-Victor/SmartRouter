'use client';

import { useEffect, useMemo, useRef } from 'react';

/** Debounce a callback (trailing edge). The latest callback is always used. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  const fnRef = useRef(fn);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  return useMemo(
    () =>
      (...args: A) => {
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          fnRef.current(...args);
        }, ms);
      },
    [ms],
  );
}
