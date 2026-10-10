import { create } from 'zustand';

export type WalletStatus = 'idle' | 'connecting' | 'signing' | 'connected' | 'error';

export interface WalletState {
  status: WalletStatus;
  /** Tempo address of the signed-in passkey account. */
  address: string | null;
  kind: 'passkey' | 'mock' | null;
  /** The API session cookie has been established via SIWE. */
  sessionReady: boolean;
  /** The access key is authorized and the payment session manager is configured. */
  paymentsReady: boolean;
  error: string | null;
}

export interface WalletActions {
  setStatus: (status: WalletStatus) => void;
  setAccount: (account: { address: string; kind: 'passkey' | 'mock' } | null) => void;
  setSessionReady: (ready: boolean) => void;
  setPaymentsReady: (ready: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: WalletState = {
  status: 'idle',
  address: null,
  kind: null,
  sessionReady: false,
  paymentsReady: false,
  error: null,
};

/**
 * Wallet connection status (client-side). Balances are never stored; the only money figure the
 * app keeps is the payment session summary from `/sessions/current` (allocationStore).
 */
export const useWalletStore = create<WalletState & WalletActions>()((set) => ({
  ...initialState,
  setStatus: (status) => {
    set({ status, ...(status === 'error' ? {} : { error: null }) });
  },
  setAccount: (account) => {
    set(account ? { address: account.address, kind: account.kind } : { address: null, kind: null });
  },
  setSessionReady: (sessionReady) => {
    set({ sessionReady });
  },
  setPaymentsReady: (paymentsReady) => {
    set({ paymentsReady });
  },
  setError: (error) => {
    set({ error, status: error ? 'error' : 'idle' });
  },
  reset: () => {
    set({ ...initialState });
  },
}));

export const selectIsConnected = (s: WalletState): boolean => s.status === 'connected' && s.address !== null && s.sessionReady;
