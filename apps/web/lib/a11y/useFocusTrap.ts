'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus inside `ref` while `active`, focuses the first focusable (or the
 * container) on activation and restores the previously focused element on release.
 * Used by Sheet / Dialog / Drawer (UI_UX_Brief §10).
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;
    const previous = document.activeElement as HTMLElement | null;

    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusables()[0];
    (first ?? container).focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const head = items[0];
      const tail = items[items.length - 1];
      if (!head || !tail) return;
      const current = document.activeElement;
      if (e.shiftKey && (current === head || current === container)) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && current === tail) {
        e.preventDefault();
        head.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      previous?.focus({ preventScroll: true });
    };
  }, [ref, active]);
}
