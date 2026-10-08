import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { setTempoAccountsForTests } from '@/lib/tempo/accounts';
import { openDeposit } from '@/lib/tempo/deposit';
import { MockTempoAccounts } from '@/lib/tempo/mock';
import { openSwapToUsdce } from '@/lib/tempo/swap';

import { useBalance } from '../useBalance';

describe('useBalance + deposit/swap', () => {
  it('reads balances through the adapter and refetches after deposit and swap', async () => {
    setTempoAccountsForTests(new MockTempoAccounts(0));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useBalance(), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.hasNonUsdce).toBe(true);
    expect(result.current.usdce).toBe(12_500_000);

    await openDeposit(qc);
    await waitFor(() => {
      expect(result.current.usdce).toBe(14_500_000);
    });

    await openSwapToUsdce(qc);
    await waitFor(() => {
      expect(result.current.hasNonUsdce).toBe(false);
    });
    expect(result.current.usdce).toBe(18_500_000);
    setTempoAccountsForTests(null);
  });
});
