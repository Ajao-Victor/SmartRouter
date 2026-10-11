'use client';

import { useCallback } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { apiUnreachableHint } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/keys';
import { signInWithWallet } from '@/lib/tempo/siwe';
import { connectWallet, disconnectWallet, getCurrentWallet, restoreWallet, setCurrentWallet } from '@/lib/tempo/wallet';

import { resetAllStores } from '@/stores';
import { toast } from '@/stores/toastStore';
import { useWalletStore } from '@/stores/walletStore';

/**
 * Wallet sign-in (PDF "Wallet and sign-in"): connect the Tempo passkey → `POST /auth/challenge`
 * → sign the SIWE message → `POST /auth/verify` (cookie) → `GET /me`. The same account pays, so
 * the access key is authorized on the first paid run, not here.
 */
export function useAuth() {
  const qc = useQueryClient();
  const status = useWalletStore((s) => s.status);
  const address = useWalletStore((s) => s.address);

  const signIn = useMutation({
    mutationFn: async () => {
      const w = useWalletStore.getState();
      w.setStatus('connecting');
      const wallet = await connectWallet();
      setCurrentWallet(wallet);
      w.setAccount({ address: wallet.address, kind: wallet.kind });
      w.setStatus('signing');
      await signInWithWallet(wallet.signer);
      w.setSessionReady(true);
      w.setStatus('connected');
      return api.me.get();
    },
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.me(), user);
      void qc.invalidateQueries({ queryKey: queryKeys.me() });
    },
    onError: (err) => {
      const w = useWalletStore.getState();
      const cancelled = err instanceof Error && (/cancel|abort|NotAllowed/i.test(err.message) || err.name === 'NotAllowedError');
      w.setError(cancelled ? null : err instanceof Error ? err.message : 'Sign-in failed');
      if (cancelled) toast.info('Sign-in cancelled');
      else if (isApiError(err) && err.code === 'NETWORK') toast.error('Could not reach SmartRouter', apiUnreachableHint());
      else if (isApiError(err) && err.code === 'FORBIDDEN') toast.error('This wallet is not allowed to sign in here', err.message);
      else toast.error("Couldn't verify your signature. Try again.", isApiError(err) ? err.message : err instanceof Error ? err.message : undefined);
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      try {
        await api.auth.logout();
      } finally {
        await disconnectWallet();
      }
    },
    onSettled: () => {
      qc.clear();
      resetAllStores();
    },
  });

  /** Silently rebuild the wallet from the stored passkey (no prompt); the cookie decides sign-in. */
  const restore = useCallback(async () => {
    if (getCurrentWallet()) return;
    const wallet = await restoreWallet();
    if (!wallet) return;
    setCurrentWallet(wallet);
    const w = useWalletStore.getState();
    w.setAccount({ address: wallet.address, kind: wallet.kind });
    w.setStatus('connected');
  }, []);

  return { signIn, signOut, restore, status, address };
}
