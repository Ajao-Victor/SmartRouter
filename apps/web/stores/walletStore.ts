import { create } from 'zustand';

export type WalletStatus =
  | 'idle'
  | 'initialising'
  | 'connecting'
  | 'signing'
  | 'connected'
  | 'error';

export interface WalletState {
  status: WalletStatus;
  /** Tempo address once the SDK has signed the user in. */
  address: string | null;
  /** Whether the API session cookie has been established via SIWE. */
  sessionReady: boolean;
  error: string | null;
}

export interface WalletActions {
  setStatus: (status: WalletStatus) => void;
  setAddress: (address: string | null) => void;
  setSessionReady: (ready: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: WalletState = {
  status: 'idle',
  address: null,
  sessionReady: false,
  error: null,
};

/**
 * Tempo SDK connection status (client-side). Balances are NOT here — they are read live
 * from Tempo through TanStack Query (PDF: wallet balances are never stored).
 */
export const useWalletStore = create<WalletState & WalletActions>()((set) => ({
  ...initialState,
  setStatus: (status) => {
    set({ status, ...(status === 'error' ? {} : { error: null }) });
  },
  setAddress: (address) => {
    set({ address });
  },
  setSessionReady: (sessionReady) => {
    set({ sessionReady });
  },
  setError: (error) => {
    set({ error, status: error ? 'error' : 'idle' });
  },
  reset: () => {
    set({ ...initialState });
  },
}));

export const selectIsConnected = (s: WalletState): boolean =>
  s.status === 'connected' && s.address !== null && s.sessionReady;
