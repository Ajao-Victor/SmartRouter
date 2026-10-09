'use client';

import { useEffect } from 'react';

import { useSignerStore } from '@/stores/signerStore';
import { useUiStore } from '@/stores/uiStore';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

/**
 * Bridges persisted user preferences into the DOM and the motion system.
 *
 * Hydration strategy (no SSR mismatch):
 *  1. Server + first client paint render store defaults (dark, full motion).
 *  2. After mount, `persist.rehydrate()` loads IndexedDB values and flips `hydrated`.
 *  3. Effects then apply `data-theme` and the reduced-motion override.
 * The signer bookkeeping (`sr:signer`) rehydrates here too so a reload keeps the open channel;
 * `useSession` reconciles it with the API once `/api/sessions/current` loads.
 */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const forceReduced = useUiStore((s) => s.forceReducedMotion);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(useSignerStore.persist.rehydrate());
    void Promise.resolve(useUiStore.persist.rehydrate()).finally(() => {
      if (!cancelled) useUiStore.getState().markHydrated();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <ReducedMotionProvider forceReduced={forceReduced}>{children}</ReducedMotionProvider>;
}
