'use client';

import { useEffect, useState } from 'react';

import { env } from '@/lib/env';

/**
 * Boots the MSW worker when `NEXT_PUBLIC_MOCK=1` so the app runs fully offline against the
 * proposed contract (Task 9). Children render only once the worker is active so no request
 * escapes to a real API. In production/mock-off this is a pass-through.
 */
export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!env.mock);

  useEffect(() => {
    if (!env.mock) return;
    let cancelled = false;
    void import('@/tests/mocks/browser').then(async ({ worker }) => {
      await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
