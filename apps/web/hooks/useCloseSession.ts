'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import { closeSession, toPaymentError } from '@/lib/tempo/session';

import { useAllocationStore } from '@/stores/allocationStore';
import { toast } from '@/stores/toastStore';

/** PDF "Close": `manager.close()` returns the unspent deposit now (the backend also closes sessions idle for 24 h). */
export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      useAllocationStore.getState().beginClose();
      try {
        await closeSession();
      } catch (err) {
        useAllocationStore.getState().settle();
        throw toPaymentError(err) ?? err;
      }
    },
    onSuccess: () => {
      useAllocationStore.getState().reset();
      void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
      toast.success('Session closed', 'Unspent deposit returned to your wallet.');
    },
    onError: (err) => {
      toast.error('Could not close the session', isApiError(err) ? err.message : err instanceof Error ? err.message : undefined);
    },
  });
}
