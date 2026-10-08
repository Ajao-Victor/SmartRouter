'use client';

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { getTempoAccounts } from '@/lib/tempo/accounts';

import { useUiStore } from '@/stores/uiStore';

import type { TokenBalance } from '@/components/wallet/BalanceList';

/**
 * Balances read live from Tempo through the SDK adapter (PDF: wallet balances are never stored).
 * Refetches every 15 s while the wallet sheet is open, and on demand after deposit/swap.
 */
export function useBalance(enabled = true) {
  const sheetOpen = useUiStore((s) => s.walletSheetOpen);
  const query = useQuery({
    queryKey: queryKeys.wallet.balance(),
    queryFn: async (): Promise<TokenBalance[]> => {
      const tempo = getTempoAccounts();
      await tempo.init();
      return tempo.getBalances();
    },
    enabled,
    staleTime: 10_000,
    refetchInterval: sheetOpen ? 15_000 : false,
  });
  const hasNonUsdce = (query.data ?? []).some((b) => b.token !== 'USDC.e' && b.micro > 0);
  const usdce = query.data?.find((b) => b.token === 'USDC.e')?.micro ?? null;
  return { ...query, hasNonUsdce, usdce };
}
