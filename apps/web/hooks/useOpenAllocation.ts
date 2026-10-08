'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { MicroUsd } from '@/lib/money';
import { getSessionClient } from '@/lib/tempo/session';
import { voucherSigner } from '@/lib/tempo/session/voucherSigner';
import { ensureSpendPermission } from '@/lib/tempo/spendPermission';

import { useAllocationStore } from '@/stores/allocationStore';
import { useSignerStore } from '@/stores/signerStore';
import { toast } from '@/stores/toastStore';

/**
 * PDF agent allocation, steps 2–3: ensure the scoped spend permission (one passkey tap on first
 * run) → create the local voucher signer → open the channel with `maxDeposit` = allocation →
 * register channel + `authorized_signer` with the API → mirror into the stores.
 */
export function useOpenAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (allocationMicro: MicroUsd) => {
      await ensureSpendPermission();
      const client = getSessionClient();
      // Key is created before the channel exists; we re-key by channel id after opening.
      const draftId = `draft_${String(Date.now())}`;
      const publicKey = await voucherSigner.publicKeyHex(draftId);
      const { channelId } = await client.openChannel({ maxDepositMicro: allocationMicro, authorizedSigner: publicKey });
      // Move the draft key under the real channel id so vouchers sign with the registered key.
      const pair = await voucherSigner.getOrCreate(draftId);
      await voucherSigner.adopt(channelId, pair);
      await voucherSigner.forget(draftId);
      const session = await api.sessions.register({ channel_id: channelId, authorized_signer: publicKey });
      useAllocationStore.getState().hydrateFromSession(session);
      useSignerStore.getState().setSigner({ publicKey, channelId, depositMicro: session.deposit, cumulativeMicro: session.highest_voucher });
      return session;
    },
    onSuccess: (session) => {
      qc.setQueryData(queryKeys.session.current(), session);
      void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
      toast.success('Allocation open', 'Requests are paid with prompt-free vouchers.');
    },
    onError: (err) => {
      toast.error('Could not open the allocation', isApiError(err) ? err.message : err instanceof Error ? err.message : undefined);
    },
  });
}
