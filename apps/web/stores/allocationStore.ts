import { create } from 'zustand';

import type { DepositUsage, SessionNetwork, SessionSummary, SessionsCurrent } from '@/lib/api/types';
import { clampMicro, micro, type MicroUsd } from '@/lib/money';

export type AllocationStatus = 'none' | 'open' | 'used' | 'toppingUp' | 'closing' | 'closed';

/** PDF low-balance alert: below ~10% of the deposit (or below the next quote's price). */
export const LOW_ALLOCATION_PCT = 0.1;

export interface AllocationState {
  channelId: string | null;
  depositUsd: MicroUsd;
  spentUsd: MicroUsd;
  remainingUsd: MicroUsd;
  requests: number;
  /** The backend's suggested deposit (defaults to the user's allocation). */
  suggestedDepositUsd: MicroUsd;
  status: AllocationStatus;
  /** Last charge applied — drives the header drain animation. */
  lastChargeUsd: MicroUsd;
  /** Live `network` from `/sessions/current`: escrow token, payee, operator. */
  network: SessionNetwork | null;
  /** Backend's own alert (`low` / `used` …), when it sends one. */
  alert: string | null;
  /** Weekly spend vs limit. */
  weeklySpentUsd: MicroUsd;
  weeklyLimitUsd: MicroUsd | null;
  /** Free messages left today (from quotes / `POST /chats`). */
  freeRemaining: number | null;
  paidRunsEnabled: boolean;
}

export interface AllocationActions {
  /** Mirror `GET /sessions/current` (PDF: refresh it after each `done` event). */
  hydrate: (current: SessionsCurrent | null) => void;
  /** `usage.deposit` from `meta` / `done` — the freshest numbers the server has. */
  applyUsage: (deposit: DepositUsage) => void;
  /** `meta.remainingUsd` on a paid run. */
  setRemaining: (remainingUsd: MicroUsd) => void;
  /** Apply a `done.chargedUsd` optimistically until the session refetches. */
  applyCharge: (chargedUsd: MicroUsd) => void;
  setFreeRemaining: (n: number | null) => void;
  beginTopUp: () => void;
  beginClose: () => void;
  settle: () => void;
  reset: () => void;
}

const zero = micro(0);

const initialState: AllocationState = {
  channelId: null,
  depositUsd: zero,
  spentUsd: zero,
  remainingUsd: zero,
  requests: 0,
  suggestedDepositUsd: micro(2_000_000),
  status: 'none',
  lastChargeUsd: zero,
  network: null,
  alert: null,
  weeklySpentUsd: zero,
  weeklyLimitUsd: null,
  freeRemaining: null,
  paidRunsEnabled: true,
};

function statusFor(session: Pick<SessionSummary, 'status' | 'remainingUsd'>): AllocationStatus {
  if (session.status === 'closed') return 'closed';
  return session.remainingUsd <= 0 ? 'used' : 'open';
}

export const useAllocationStore = create<AllocationState & AllocationActions>()((set) => ({
  ...initialState,
  hydrate: (current) => {
    if (!current) {
      set((prev) => ({ ...initialState, freeRemaining: prev.freeRemaining }));
      return;
    }
    const s = current.session ?? (current.usage?.deposit ? { ...current.usage.deposit, requests: 0, status: 'open' } : null);
    set((prev) => ({
      suggestedDepositUsd: current.suggestedDepositUsd,
      network: current.network ?? prev.network,
      paidRunsEnabled: current.paidRunsEnabled,
      alert: current.usage?.alert ?? null,
      weeklySpentUsd: current.usage?.weekly?.spentUsd ?? prev.weeklySpentUsd,
      weeklyLimitUsd: current.usage?.weekly?.limitUsd ?? prev.weeklyLimitUsd,
      channelId: s?.channelId ?? null,
      depositUsd: s?.depositUsd ?? zero,
      spentUsd: s?.spentUsd ?? zero,
      remainingUsd: s?.remainingUsd ?? zero,
      requests: s?.requests ?? 0,
      status: s ? statusFor(s) : 'none',
      lastChargeUsd: prev.lastChargeUsd,
    }));
  },
  applyUsage: (deposit) => {
    set((prev) => ({
      channelId: deposit.channelId ?? prev.channelId,
      depositUsd: deposit.depositUsd,
      spentUsd: deposit.spentUsd,
      remainingUsd: deposit.remainingUsd,
      status: prev.status === 'closed' ? 'closed' : deposit.remainingUsd <= 0 ? 'used' : 'open',
    }));
  },
  setRemaining: (remainingUsd) => {
    set((s) => ({ remainingUsd, status: s.status === 'closed' ? 'closed' : remainingUsd <= 0 ? 'used' : s.status === 'none' ? 'open' : s.status }));
  },
  applyCharge: (chargedUsd) => {
    set((s) => {
      const remaining = clampMicro(micro(s.remainingUsd - chargedUsd), s.depositUsd);
      return {
        remainingUsd: remaining,
        spentUsd: micro(s.spentUsd + chargedUsd),
        requests: s.requests + 1,
        lastChargeUsd: chargedUsd,
        status: s.status === 'closed' ? 'closed' : remaining <= 0 ? 'used' : 'open',
      };
    });
  },
  setFreeRemaining: (freeRemaining) => {
    set({ freeRemaining });
  },
  beginTopUp: () => {
    set({ status: 'toppingUp' });
  },
  beginClose: () => {
    set({ status: 'closing' });
  },
  settle: () => {
    set((s) => ({ status: s.channelId ? (s.remainingUsd <= 0 ? 'used' : 'open') : 'none' }));
  },
  reset: () => {
    set({ ...initialState });
  },
}));

/* ------------------------------- selectors -------------------------------- */

export const selectRemainingPct = (s: AllocationState): number => (s.depositUsd > 0 ? s.remainingUsd / s.depositUsd : 0);

export const selectIsLow = (s: AllocationState): boolean => s.status === 'open' && (s.alert === 'low' || selectRemainingPct(s) < LOW_ALLOCATION_PCT);

export const selectIsUsed = (s: AllocationState): boolean => s.status === 'used';

/** The next run would pass the deposit (PDF: show Top up / Continue free before contacting the server). */
export const selectCanAfford =
  (priceUsd: MicroUsd) =>
  (s: AllocationState): boolean =>
    s.status === 'none' ? priceUsd <= s.suggestedDepositUsd : s.status !== 'closed' && priceUsd <= s.remainingUsd;
