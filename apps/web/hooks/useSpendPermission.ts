'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ensureSpendPermission, getSpendPermission, revokeSpendPermission } from '@/lib/tempo/spendPermission';

import { toast } from '@/stores/toastStore';

import type { SpendPermissionStatus } from '@/components/wallet/SpendPermissionCard';

const KEY = ['tempo', 'spendPermission'] as const;

/** Current scoped spend permission (from the SDK) + approve / revoke mutations. */
export function useSpendPermission(enabled = true) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: KEY, queryFn: getSpendPermission, enabled, staleTime: 60_000 });

  const approve = useMutation({
    mutationFn: ensureSpendPermission,
    onSuccess: (p) => {
      qc.setQueryData(KEY, p);
      toast.success('Spend permission granted', 'USDC.e only · SmartRouter sessions only');
    },
    onError: () => {
      toast.error('Spend permission was not granted');
    },
  });

  const revoke = useMutation({
    mutationFn: revokeSpendPermission,
    onSuccess: () => {
      qc.setQueryData(KEY, null);
      toast.info('Spend permission revoked');
    },
  });

  // Named to avoid colliding with react-query's own `status` field.
  const permissionStatus: SpendPermissionStatus = query.data ? 'granted' : 'none';
  return { ...query, permissionStatus, approve, revoke };
}
