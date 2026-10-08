import { create } from 'zustand';

import { micro, type MicroUsd } from '@/lib/money';

/**
 * Public bookkeeping for the browser's voucher signer (PDF: local signer registered as
 * the channel's `authorizedSigner`, TIP-1034; vouchers are cumulative).
 *
 * The private key NEVER enters this store (rules.md §4.8). It lives as a non-extractable
 * WebCrypto key in IndexedDB (Task 20). Here: public key, channel, running total, cap.
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

export const useSignerStore = create<SignerState & SignerActions>()((set, get) => ({
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
  reset: () => {
    set({ ...initialState });
  },
}));

export const selectSignerReady = (s: SignerState): boolean =>
  s.publicKey !== null && s.channelId !== null;
