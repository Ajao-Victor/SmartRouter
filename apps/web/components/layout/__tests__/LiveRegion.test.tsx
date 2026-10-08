import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';

import { micro } from '@/lib/money';

import { useAllocationStore } from '@/stores/allocationStore';
import { useStreamStore } from '@/stores/streamStore';

import { LiveRegion } from '../LiveRegion';

vi.mock('@/lib/api/endpoints', () => ({ api: { models: { list: vi.fn().mockResolvedValue([]) } } }));

describe('LiveRegion', () => {
  it('announces streaming, completion and allocation used', () => {
    useStreamStore.getState().clearAll();
    useAllocationStore.getState().reset();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LiveRegion />
      </QueryClientProvider>,
    );
    const region = screen.getByTestId('live-region');
    expect(region).toHaveAttribute('aria-live', 'polite');
    act(() => {
      useStreamStore.getState().start('m1', { modelId: 'x' });
    });
    expect(region).toHaveTextContent('Streaming reply…');
    act(() => {
      useStreamStore.getState().done('m1');
    });
    expect(region).toHaveTextContent(/^Done/);
    act(() => {
      useAllocationStore.getState().hydrateFromSession({ channel_id: 'c', user_id: 'u', authorized_signer: 's', deposit: micro(100), highest_voucher: micro(100), counted: micro(0), settled: micro(0), last_used_at: null, status: 'open' });
    });
    expect(region).toHaveTextContent('Allocation used — Top up');
  });
});
