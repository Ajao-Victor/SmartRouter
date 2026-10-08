'use client';

import { useCallback } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import { getTempoAccounts } from '@/lib/tempo/accounts';
import { signInWithEthereum } from '@/lib/tempo/siwe';

import { resetAllStores } from '@/stores';
import { toast } from '@/stores/toastStore';
import { useWalletStore } from '@/stores/walletStore';

/**
 * Sign in: Tempo passkey dialog → SIWE → cookie → `/api/me`. Sign out: API logout, clear caches
 * and stores (rules.md §4.7). Status is mirrored in `walletStore`.
 */
export function useAuth() {
  const qc = useQueryClient();
  const status = useWalletStore((s) => s.status);
  const address = useWalletStore((s) => s.address);

  const signIn = useMutation({
    mutationFn: async () => {
      const w = useWalletStore.getState();
      const tempo = getTempoAccounts();
      w.setStatus('initialising');
      await tempo.init();
      w.setStatus('connecting');
      const account = await tempo.signIn();
      w.setAddress(account.address);
      w.setStatus('signing');
      const user = await signInWithEthereum(tempo, account);
      w.setSessionReady(true);
      w.setStatus('connected');
      return user;
    },
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.me(), user);
      void qc.invalidateQueries({ queryKey: queryKeys.me() });
    },
    onError: (err) => {
      const w = useWalletStore.getState();
      const cancelled = err instanceof Error && /cancel|abort/i.test(err.message);
      w.setError(cancelled ? null : err instanceof Error ? err.message : 'Sign-in failed');
      if (cancelled) toast.info('Sign-in cancelled');
      else toast.error("Couldn't verify your signature. Try again.", isApiError(err) ? err.message : undefined);
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      try {
        await api.auth.logout();
      } finally {
        await getTempoAccounts().signOut();
      }
    },
    onSettled: () => {
      qc.clear();
      resetAllStores();
    },
  });

  const restore = useCallback(async () => {
    const tempo = getTempoAccounts();
    await tempo.init();
    const account = await tempo.getAccount();
    const w = useWalletStore.getState();
    if (account) {
      w.setAddress(account.address);
      w.setStatus('connected');
    }
  }, []);

  return { status, address, signIn, signOut, restore };
}
