'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isAddress } from '@/lib/explorer';
import type { MicroUsd } from '@/lib/money';
import { getCurrentWallet } from '@/lib/tempo/wallet';
import { getTokenBalance, requestFaucet, sendTokens } from '@/lib/tempo/walletActions';

import { useAllocationStore } from '@/stores/allocationStore';
import { toast } from '@/stores/toastStore';

const balanceKey = (address: string | null, token: string | null) => ['wallet', 'balance', address, token] as const;

/** On-chain balance of the session token (read from the public RPC, never stored). */
export function useWalletBalance(address: string | null, enabled = true) {
  const token = useAllocationStore((s) => s.network?.token ?? null);
  return useQuery({
    queryKey: balanceKey(address, token),
    queryFn: () => getTokenBalance(address ?? '', token ?? ''),
    enabled: enabled && address !== null && token !== null,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/** Testnet faucet (click-only). */
export function useFaucet(address: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => requestFaucet(address ?? ''),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      toast.success('Test funds requested', 'The faucet sends pathUSD to your address in a few seconds.');
    },
    onError: (err) => {
      toast.error('Faucet request failed', err instanceof Error ? err.message : undefined);
    },
  });
}

/** Send tokens from the passkey wallet to another Tempo address (one passkey prompt). */
export function useSendTokens() {
  const qc = useQueryClient();
  const token = useAllocationStore((s) => s.network?.token ?? null);
  return useMutation({
    mutationFn: async ({ to, amountUsd }: { to: string; amountUsd: MicroUsd }) => {
      if (!isAddress(to)) throw new Error('Enter a valid Tempo address (0x…)');
      if (amountUsd <= 0) throw new Error('Enter an amount');
      if (!token) throw new Error('The session token is not known yet — reload and try again');
      const wallet = getCurrentWallet();
      return sendTokens({ account: wallet?.root ?? null, token, to, amountUsd });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      toast.success('Sent', 'The transfer is on its way.');
    },
    onError: (err) => {
      toast.error('Could not send', err instanceof Error ? err.message : undefined);
    },
  });
}
