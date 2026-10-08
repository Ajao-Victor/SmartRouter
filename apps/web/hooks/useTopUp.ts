'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { MicroUsd } from '@/lib/money';
import { getSessionClient } from '@/lib/tempo/session';

import { useAllocationStore } from '@/stores/allocationStore';
import { useSignerStore } from '@/stores/signerStore';
import { toast } from '@/stores/toastStore';

/**
 * PDF step 5: "Allocation used — Top up $2". One tap calls the session's top-up without
 * closing it. NEVER automatic: this mutation is only ever invoked from a click handler
 * (lint bans timers in this file).
 */
export function useTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amountMicro: MicroUsd) => {
      const alloc = useAllocationStore.getState();
      if (!alloc.channelId) throw new Error('No open allocation to top up');
      alloc.beginTopUp();
      try {
        const status = await getSessionClient().topUp({ channelId: alloc.channelId, amountMicro });
        const session = await api.sessions.notifyTopUp(alloc.channelId, amountMicro);
        useSignerStore.getState().setDeposit(status.depositMicro);
        useAllocationStore.getState().endTopUp(session);
        return session;
      } catch (err) {
        useAllocationStore.getState().endTopUp(null);
        throw err;
      }
    },
    onSuccess: (session) => {
      qc.setQueryData(queryKeys.session.current(), session);
      void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
      toast.success('Topped up', 'Your allocation is refilled.');
    },
    onError: (err) => {
      toast.error('Top-up failed', isApiError(err) ? err.message : err instanceof Error ? err.message : undefined);
    },
  });
}
