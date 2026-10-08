'use client';

import { useSyncExternalStore } from 'react';

import { createPortal } from 'react-dom';

const subscribe = () => () => undefined;

/** Renders children into document.body after mount (SSR renders nothing). */
export function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return createPortal(children, document.body);
}
