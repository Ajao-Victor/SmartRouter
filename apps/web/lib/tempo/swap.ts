import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { getTempoAccounts } from '@/lib/tempo/accounts';

/**
 * PDF `wallet_swap`: one-tap swap to USDC.e on Tempo's built-in DEX via the wallet's swap screen.
 * Every MPP provider is paid in USDC.e, so other Tempo stablecoins are swapped first.
 */
export async function openSwapToUsdce(qc: QueryClient): Promise<void> {
  const tempo = getTempoAccounts();
  await tempo.init();
  await tempo.openSwap();
  await qc.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
}
