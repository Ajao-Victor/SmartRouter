import { create } from 'zustand';

import type { SessionSummary, SessionsCurrent } from '@/lib/api/types';
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
  /** Handover: `paidRunsEnabled: false` → hide paid models. */
  paidRunsEnabled: boolean;
  /** `network.chainId` from `/sessions/current` — the chain the wallet client is built on. */
  chainId: number | null;
  /** `network.token` — the escrow token (pathUSD on Moderato, USDC.e on mainnet). */
  token: string | null;
  /** Deposit the user picked in the deposit dialog; null = `suggestedDepositUsd`. */
  chosenDepositUsd: MicroUsd | null;
}

export interface AllocationActions {
  /** Mirror `GET /sessions/current` (PDF: refresh it after each `done` event). */
  hydrate: (current: SessionsCurrent | null) => void;
  /** `meta.remainingUsd` on a paid run — the freshest number the server has. */
  setRemaining: (remainingUsd: MicroUsd) => void;
  /** Apply a `done.chargedUsd` optimistically until the session refetches. */
  applyCharge: (chargedUsd: MicroUsd) => void;
  /** The deposit the next manager opens with (Handover: `maxDeposit`). */
  chooseDeposit: (amountUsd: MicroUsd | null) => void;
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
  paidRunsEnabled: true,
  chainId: null,
  token: null,
  chosenDepositUsd: null,
};

function statusFor(session: SessionSummary): AllocationStatus {
  if (session.status === 'closed') return 'closed';
  return session.remainingUsd <= 0 ? 'used' : 'open';
}

export const useAllocationStore = create<AllocationState & AllocationActions>()((set) => ({
  ...initialState,
  hydrate: (current) => {
    if (!current) {
      set({ ...initialState });
      return;
    }
    const s = current.session;
    set((prev) => ({
      suggestedDepositUsd: current.suggestedDepositUsd,
      channelId: s?.channelId ?? null,
      depositUsd: s?.depositUsd ?? zero,
      spentUsd: s?.spentUsd ?? zero,
      remainingUsd: s?.remainingUsd ?? zero,
      requests: s?.requests ?? 0,
      status: s ? statusFor(s) : 'none',
      lastChargeUsd: prev.lastChargeUsd,
      paidRunsEnabled: current.paidRunsEnabled,
      chainId: current.network?.chainId ?? prev.chainId,
      token: current.network?.token ?? prev.token,
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
  chooseDeposit: (chosenDepositUsd) => {
    set({ chosenDepositUsd });
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

export const selectIsLow = (s: AllocationState): boolean => s.status === 'open' && selectRemainingPct(s) < LOW_ALLOCATION_PCT;

export const selectIsUsed = (s: AllocationState): boolean => s.status === 'used';

/** The deposit a new session opens with: the user's choice, else `suggestedDepositUsd`. */
export const selectNextDeposit = (s: AllocationState): MicroUsd => s.chosenDepositUsd ?? s.suggestedDepositUsd;

/** The next run would pass the deposit (show the deposit dialog / Continue free before contacting the server). */
export const selectCanAfford =
  (priceUsd: MicroUsd) =>
  (s: AllocationState): boolean =>
    s.status === 'none' || s.status === 'closed' ? priceUsd <= selectNextDeposit(s) : priceUsd <= s.remainingUsd;
