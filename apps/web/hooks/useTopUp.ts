'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import type { MicroUsd } from '@/lib/money';
import { toPaymentError } from '@/lib/tempo/paymentErrors';
import { getCurrentWallet } from '@/lib/tempo/wallet';

import { useAllocationStore } from '@/stores/allocationStore';
import { toast } from '@/stores/toastStore';

/**
 * PDF "Top up": `manager.topUp('2')`. NEVER automatic — this mutation is only ever invoked from
 * a click handler (lint bans timers in this file). The first top-up also prepares payments if
 * the user has never run a paid model (one passkey approval).
 */
export function useTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amountUsd: MicroUsd) => {
      const wallet = getCurrentWallet();
      if (!wallet) throw new Error('Sign in with your wallet first');
      useAllocationStore.getState().beginTopUp();
      try {
        await wallet.preparePayments(useAllocationStore.getState().suggestedDepositUsd);
        const { topUpSession } = await import('@/lib/tempo/session');
        await topUpSession(amountUsd);
      } catch (err) {
        throw toPaymentError(err) ?? err;
      } finally {
        useAllocationStore.getState().settle();
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
      toast.success('Topped up', 'Your allocation is refilled.');
    },
    onError: (err) => {
      toast.error('Top-up failed', isApiError(err) ? err.message : err instanceof Error ? err.message : undefined);
    },
  });
}
