'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import { toUsd, type MicroUsd } from '@/lib/money';
import { toPaymentError } from '@/lib/tempo/paymentErrors';

import { selectNextDeposit, useAllocationStore } from '@/stores/allocationStore';
import { toast } from '@/stores/toastStore';

/**
 * The deposit dialog's action (Handover "When the deposit runs out" — the tested path):
 * save the preferred deposit (`PATCH /me/settings { allocationUsd }`), `manager.close()` the open
 * deposit (the treasury receives what was spent, the rest returns), then a new `sessionManager`
 * with the new `maxDeposit`. The next paid run opens the new deposit (one approval).
 * `manager.topUp` is not used in v1. Only ever invoked from a click (lint bans timers here).
 */
export function useDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amountUsd: MicroUsd) => {
      const alloc = useAllocationStore.getState();
      const previous = selectNextDeposit(alloc);
      const hadSession = alloc.status !== 'none' && alloc.status !== 'closed';
      alloc.beginTopUp();
      try {
        await api.me.updateSettings({ allocationUsd: toUsd(amountUsd) });
        const { closeSession, resetSession } = await import('@/lib/tempo/session');
        if (hadSession) await closeSession({ maxDepositUsd: previous, chainId: alloc.chainId });
        else resetSession();
      } catch (err) {
        useAllocationStore.getState().settle();
        throw toPaymentError(err) ?? err;
      }
      const next = useAllocationStore.getState();
      next.reset();
      next.chooseDeposit(amountUsd);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
      void qc.invalidateQueries({ queryKey: queryKeys.me() });
    },
    onError: (err) => {
      toast.error('Could not set up the new deposit', isApiError(err) ? err.message : err instanceof Error ? err.message : undefined);
    },
  });
}
