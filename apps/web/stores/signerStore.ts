import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UserSession } from '@/lib/api/types';
import { idbStateStorage } from '@/lib/idb';
import { micro, type MicroUsd } from '@/lib/money';

/**
 * Public bookkeeping for the browser's voucher signer (PDF: local signer registered as
 * the channel's `authorizedSigner`, TIP-1034; vouchers are cumulative).
 *
 * The private key NEVER enters this store (rules.md §4.8). It lives as a non-extractable
 * WebCrypto key in IndexedDB (Task 20). Here: public key, channel, running total, cap.
 *
 * Persisted (IndexedDB, `sr:signer`) so a reload keeps the channel the key belongs to;
 * `reconcile()` re-bases the running total on the API's `highest_voucher` once the session
 * loads, and clears everything when the session is gone or belongs to another channel.
 */
export interface SignerState {
  publicKey: string | null;
  channelId: string | null;
  /** Cumulative amount signed so far on this channel. */
  cumulativeMicro: MicroUsd;
  /** Hard cap = channel deposit. The signer refuses to exceed it. */
  depositMicro: MicroUsd;
}

export interface SignerActions {
  setSigner: (args: {
    publicKey: string;
    channelId: string;
    depositMicro: MicroUsd;
    cumulativeMicro?: MicroUsd;
  }) => void;
  /** Raise the cap after a top-up (deposit grows, cumulative continues). */
  setDeposit: (depositMicro: MicroUsd) => void;
  /**
   * Reserve `priceMicro` on the cumulative total and return the new total to sign.
   * Throws `VoucherCapError` when the total would exceed the deposit.
   */
  advance: (priceMicro: MicroUsd) => MicroUsd;
  /** Undo a reservation whose run delivered no result (PDF: not counted). */
  rollback: (priceMicro: MicroUsd) => void;
  /**
   * Align with the server's view after `/api/sessions/current` loads (and after a reload):
   * same channel → cap = deposit, total = max(local, highest_voucher); no/other channel → reset.
   */
  reconcile: (session: UserSession | null) => void;
  reset: () => void;
}

export class VoucherCapError extends Error {
  constructor(
    readonly requested: MicroUsd,
    readonly cap: MicroUsd,
  ) {
    super('Voucher would exceed the channel deposit');
    this.name = 'VoucherCapError';
  }
}

const zero = micro(0);

const initialState: SignerState = {
  publicKey: null,
  channelId: null,
  cumulativeMicro: zero,
  depositMicro: zero,
};

export const useSignerStore = create<SignerState & SignerActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setSigner: ({ publicKey, channelId, depositMicro, cumulativeMicro }) => {
        set({ publicKey, channelId, depositMicro, cumulativeMicro: cumulativeMicro ?? zero });
      },
      setDeposit: (depositMicro) => {
        set({ depositMicro });
      },
      advance: (priceMicro) => {
        if (priceMicro < 0) throw new RangeError('advance(): price must be non-negative');
        const { cumulativeMicro, depositMicro } = get();
        const next = micro(cumulativeMicro + priceMicro);
        if (next > depositMicro) throw new VoucherCapError(next, depositMicro);
        set({ cumulativeMicro: next });
        return next;
      },
      rollback: (priceMicro) => {
        set((s) => ({ cumulativeMicro: micro(Math.max(0, s.cumulativeMicro - priceMicro)) }));
      },
      reconcile: (session) => {
        const s = get();
        if (!s.channelId) return;
        if (!session || session.status === 'closed' || session.channel_id !== s.channelId) {
          set({ ...initialState });
          return;
        }
        set({
          depositMicro: session.deposit,
          cumulativeMicro: micro(Math.max(s.cumulativeMicro, session.highest_voucher)),
        });
      },
      reset: () => {
        set({ ...initialState });
      },
    }),
    {
      name: 'sr:signer',
      version: 1,
      storage: createJSONStorage(() => idbStateStorage),
      // Public bookkeeping only — the key pair stays in its own IndexedDB record.
      partialize: (s) => ({
        publicKey: s.publicKey,
        channelId: s.channelId,
        cumulativeMicro: s.cumulativeMicro,
        depositMicro: s.depositMicro,
      }),
      skipHydration: true,
    },
  ),
);

export const selectSignerReady = (s: SignerState): boolean =>
  s.publicKey !== null && s.channelId !== null;
