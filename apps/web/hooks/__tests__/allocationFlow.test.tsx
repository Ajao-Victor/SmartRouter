import { webcrypto } from 'node:crypto';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import { micro } from '@/lib/money';
import { setTempoAccountsForTests } from '@/lib/tempo/accounts';
import { MockTempoAccounts } from '@/lib/tempo/mock';
import { setSessionClientForTests } from '@/lib/tempo/session';
import { MockSessionClient } from '@/lib/tempo/session/impl.mock';

import { useAllocationStore } from '@/stores/allocationStore';
import { useSignerStore } from '@/stores/signerStore';

import { useOpenAllocation } from '../useOpenAllocation';
import { useTopUp } from '../useTopUp';

const register = vi.fn();
const notifyTopUp = vi.fn();
vi.mock('@/lib/api/endpoints', () => ({
  api: {
    sessions: {
      register: (i: { channel_id: string; authorized_signer: string }) => register(i) as Promise<unknown>,
      notifyTopUp: (id: string, amount: number) => notifyTopUp(id, amount) as Promise<unknown>,
    },
  },
}));

const session = (channel_id: string, deposit: number) => ({
  channel_id, user_id: 'u', authorized_signer: 's', deposit: micro(deposit), highest_voucher: micro(0), counted: micro(0), settled: micro(0), last_used_at: null, status: 'open' as const,
});

beforeAll(() => {
  vi.stubGlobal('crypto', webcrypto);
});
afterAll(() => {
  vi.unstubAllGlobals();
});
beforeEach(() => {
  useAllocationStore.getState().reset();
  useSignerStore.getState().reset();
  setTempoAccountsForTests(new MockTempoAccounts(0));
  setSessionClientForTests(new MockSessionClient(0));
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('open allocation → top up', () => {
  it('requests the spend permission once, opens a channel, registers the signer and tops up on demand', async () => {
    register.mockImplementation((i: { channel_id: string }) => Promise.resolve(session(i.channel_id, 2_000_000)));
    notifyTopUp.mockImplementation((id: string) => Promise.resolve(session(id, 4_000_000)));

    const open = renderHook(() => useOpenAllocation(), { wrapper });
    await act(async () => {
      await open.result.current.mutateAsync(micro(2_000_000));
    });
    const reg = register.mock.calls[0]?.[0] as { channel_id: string; authorized_signer: string };
    expect(reg.authorized_signer).toMatch(/^0x04/);
    expect(useAllocationStore.getState().status).toBe('open');
    expect(useAllocationStore.getState().depositMicro).toBe(2_000_000);
    expect(useSignerStore.getState().channelId).toBe(reg.channel_id);

    const topUp = renderHook(() => useTopUp(), { wrapper });
    await act(async () => {
      await topUp.result.current.mutateAsync(micro(2_000_000));
    });
    await waitFor(() => {
      expect(useAllocationStore.getState().depositMicro).toBe(4_000_000);
    });
    expect(useSignerStore.getState().depositMicro).toBe(4_000_000);
    expect(notifyTopUp).toHaveBeenCalledWith(reg.channel_id, 2_000_000);
  });
});
