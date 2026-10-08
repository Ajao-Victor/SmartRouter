import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { getTempoAccounts } from '@/lib/tempo/accounts';

/**
 * PDF `wallet_deposit`: the SDK's deposit dialog (chain, token, amount; Apple Pay, transfer from
 * another wallet, crypto, MACH, bridging — availability varies by country). On close we refetch
 * balances so new tokens animate in.
 */
export async function openDeposit(qc: QueryClient): Promise<void> {
  const tempo = getTempoAccounts();
  await tempo.init();
  await tempo.openDeposit();
  await qc.invalidateQueries({ queryKey: queryKeys.wallet.balance() });
}
