'use client';

import { useReducedMotionContext } from '@/components/layout/ReducedMotionProvider';

/**
 * `true` when motion should be reduced (rules.md §7: every animated component reads this).
 * Combines the OS preference, Save-Data and the app-level override via ReducedMotionProvider.
 * Safe to call outside the provider (defaults to full motion).
 */
export function useReducedMotionSafe(): boolean {
  return useReducedMotionContext().reduced;
}
