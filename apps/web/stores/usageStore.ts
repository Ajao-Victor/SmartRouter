import { create } from 'zustand';

import type { Usage, UsageAlert } from '@/lib/api/types';

/**
 * Usage banners (Handover "Usage banners"). The backend computes the banner; the frontend only
 * renders `usage.alert`. Refreshed from `GET /me` on load, `GET /sessions/current`, the paid
 * `meta` event and every `done` event — no polling.
 */
export interface UsageState {
  usage: Usage | null;
  /** `level:meter` of a dismissed warning; a new level or meter shows again. */
  dismissed: string | null;
}

export interface UsageActions {
  setUsage: (usage: Usage | null) => void;
  /** Only `warning` is dismissible. */
  dismiss: () => void;
  reset: () => void;
}

export const alertKey = (a: UsageAlert): string => `${a.level}:${a.meter}`;

const initialState: UsageState = { usage: null, dismissed: null };

export const useUsageStore = create<UsageState & UsageActions>()((set, get) => ({
  ...initialState,
  setUsage: (usage) => {
    set({ usage });
  },
  dismiss: () => {
    const alert = get().usage?.alert;
    if (alert?.level === 'warning') set({ dismissed: alertKey(alert) });
  },
  reset: () => {
    set(initialState);
  },
}));

/** The banner to show, or null (below 75%, or a dismissed warning). */
export const selectVisibleAlert = (s: UsageState): UsageAlert | null => {
  const alert = s.usage?.alert ?? null;
  if (!alert) return null;
  if (alert.level === 'warning' && s.dismissed === alertKey(alert)) return null;
  return alert;
};

/** `exhausted` blocks paid Send (the free model stays available). */
export const selectPaidBlocked = (s: UsageState): boolean => s.usage?.alert?.level === 'exhausted';
