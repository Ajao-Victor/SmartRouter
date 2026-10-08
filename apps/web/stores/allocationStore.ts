import { create } from 'zustand';

import type { UserSession } from '@/lib/api/types';
import { clampMicro, micro, type MicroUsd } from '@/lib/money';

export type AllocationStatus = 'none' | 'open' | 'used' | 'toppingUp' | 'closed';

/** Below this share of the deposit the HUD shows the "low" state (design.md §4.2). */
export const LOW_ALLOCATION_PCT = 0.25;

export interface AllocationState {
  channelId: string | null;
  depositMicro: MicroUsd;
  remainingMicro: MicroUsd;
  /** Cumulative voucher total the server has seen (PDF `user_sessions.highest_voucher`). */
  highestVoucherMicro: MicroUsd;
  status: AllocationStatus;
  /** Last voucher applied — drives the HUD drain animation. */
  lastVoucherMicro: MicroUsd;
}

export interface AllocationActions {
  /** Mirror the server session (PDF: wallet balances are never stored; sessions are). */
  hydrateFromSession: (session: UserSession | null) => void;
  /** Optimistically deduct a paid run's quoted price. */
  applyVoucher: (priceMicro: MicroUsd) => void;
  /** No result delivered → the voucher amount is not counted (PDF failure rule). */
  restoreVoucher: (priceMicro: MicroUsd) => void;
  beginTopUp: () => void;
  endTopUp: (session: UserSession | null) => void;
  reset: () => void;
}

const zero = micro(0);

const initialState: AllocationState = {
  channelId: null,
  depositMicro: zero,
  remainingMicro: zero,
  highestVoucherMicro: zero,
  status: 'none',
  lastVoucherMicro: zero,
};

function statusFor(session: UserSession, remaining: MicroUsd): AllocationStatus {
  if (session.status === 'closed') return 'closed';
  return remaining <= 0 ? 'used' : 'open';
}

function fromSession(session: UserSession): Omit<AllocationState, 'lastVoucherMicro'> {
  const remaining = clampMicro(micro(session.deposit - session.highest_voucher), session.deposit);
  return {
    channelId: session.channel_id,
    depositMicro: session.deposit,
    remainingMicro: remaining,
    highestVoucherMicro: session.highest_voucher,
    status: statusFor(session, remaining),
  };
}

export const useAllocationStore = create<AllocationState & AllocationActions>()((set) => ({
  ...initialState,
  hydrateFromSession: (session) => {
    if (!session) {
      set({ ...initialState });
      return;
    }
    set((s) => ({ ...fromSession(session), lastVoucherMicro: s.lastVoucherMicro }));
  },
  applyVoucher: (priceMicro) => {
    set((s) => {
      const remaining = clampMicro(micro(s.remainingMicro - priceMicro), s.depositMicro);
      return {
        remainingMicro: remaining,
        highestVoucherMicro: micro(s.highestVoucherMicro + priceMicro),
        lastVoucherMicro: priceMicro,
        status: s.status === 'closed' ? 'closed' : remaining <= 0 ? 'used' : 'open',
      };
    });
  },
  restoreVoucher: (priceMicro) => {
    set((s) => {
      const remaining = clampMicro(micro(s.remainingMicro + priceMicro), s.depositMicro);
      return {
        remainingMicro: remaining,
        highestVoucherMicro: clampMicro(micro(s.highestVoucherMicro - priceMicro), s.depositMicro),
        status: s.status === 'closed' ? 'closed' : remaining <= 0 ? 'used' : 'open',
      };
    });
  },
  beginTopUp: () => {
    set({ status: 'toppingUp' });
  },
  endTopUp: (session) => {
    if (!session) {
      set((s) => ({ status: s.remainingMicro <= 0 ? 'used' : 'open' }));
      return;
    }
    set((s) => ({ ...fromSession(session), lastVoucherMicro: s.lastVoucherMicro }));
  },
  reset: () => {
    set({ ...initialState });
  },
}));

/* ------------------------------- selectors -------------------------------- */

export const selectRemainingPct = (s: AllocationState): number =>
  s.depositMicro > 0 ? s.remainingMicro / s.depositMicro : 0;

export const selectIsLow = (s: AllocationState): boolean =>
  s.status === 'open' && selectRemainingPct(s) < LOW_ALLOCATION_PCT;

export const selectIsUsed = (s: AllocationState): boolean => s.status === 'used';

/** PDF: quote ≤ remaining allocation → continue. */
export const selectCanAfford =
  (priceMicro: MicroUsd) =>
  (s: AllocationState): boolean =>
    s.status === 'open' && priceMicro <= s.remainingMicro;
