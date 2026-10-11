'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import { toPaymentError } from '@/lib/tempo/paymentErrors';

import { selectNextDeposit, useAllocationStore } from '@/stores/allocationStore';
import { toast } from '@/stores/toastStore';

/**
 * Close the deposit: `manager.close()` settles on-chain — the treasury receives what was spent and
 * the rest returns to the wallet. (The backend also settles after 10 idle minutes and closes after 24 h.)
 */
export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const alloc = useAllocationStore.getState();
      alloc.beginClose();
      try {
        const { closeSession } = await import('@/lib/tempo/session');
        await closeSession({ maxDepositUsd: selectNextDeposit(alloc), chainId: alloc.chainId });
      } catch (err) {
        useAllocationStore.getState().settle();
        throw toPaymentError(err) ?? err;
      }
    },
    onSuccess: () => {
      const chosen = useAllocationStore.getState().chosenDepositUsd;
      useAllocationStore.getState().reset();
      useAllocationStore.getState().chooseDeposit(chosen);
      void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
      toast.success('Session closed', 'Unspent deposit returned to your wallet.');
    },
    onError: (err) => {
      toast.error('Could not close the session', isApiError(err) ? err.message : err instanceof Error ? err.message : undefined);
    },
  });
}
