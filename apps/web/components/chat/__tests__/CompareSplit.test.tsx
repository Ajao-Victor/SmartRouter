import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';

import type { Message } from '@/lib/api/types';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

import { CompareSplit } from '../CompareSplit';

vi.mock('@/lib/api/endpoints', () => ({
  api: { models: { list: vi.fn().mockResolvedValue([]) }, feedback: { vote: vi.fn() } },
}));

const msg = (id: string, model: string): Message => ({
  id, chat_id: 'c', seq: 1, role: 'assistant', content: `reply from ${model}`, attachments: [], model_id: model, request_id: `req_${id}`, result_ref: null, tokens: 3, status: 'done', created_at: '2026-10-08T00:00:00Z',
});

describe('CompareSplit', () => {
  it('shows both replies and records the pick', () => {
    const onPick = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ReducedMotionProvider forceReduced>
          <CompareSplit left={msg('a', 'glm')} right={msg('b', 'opus')} canPick onPick={onPick} />
        </ReducedMotionProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText('reply from glm')).toBeInTheDocument();
    expect(screen.getByText('reply from opus')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Pick this one' });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1] as HTMLElement);
    expect(onPick).toHaveBeenCalledWith('right');
  });
});
