import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';

import type { Message } from '@/lib/api/types';
import { micro } from '@/lib/money';

import { CompareSplit } from '../CompareSplit';

vi.mock('@/lib/api/endpoints', () => ({
  api: { catalog: { list: vi.fn().mockResolvedValue([]) }, feedback: { rate: vi.fn() } },
}));

const msg = (id: string, model: string): Message => ({
  id, role: 'assistant', text: `reply from ${model}`, modelId: model, requestId: `req_${id}`, createdAt: '2026-10-08T00:00:00Z', chargedUsd: micro(900), seq: null, files: [], citations: [], status: 'done',
});

describe('CompareSplit', () => {
  it('shows both replies and records the pick', async () => {
    const onPick = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CompareSplit left={msg('a', 'glm')} right={msg('b', 'opus')} canPick onPick={onPick} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('reply from glm')).toBeInTheDocument();
    expect(await screen.findByText('reply from opus')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Pick this one' });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1] as HTMLElement);
    expect(onPick).toHaveBeenCalledWith('right');
  });
});
