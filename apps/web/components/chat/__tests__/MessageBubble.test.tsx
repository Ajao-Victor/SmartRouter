import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';

import type { Message } from '@/lib/api/types';

import { useStreamStore } from '@/stores/streamStore';
import { useUiStore } from '@/stores/uiStore';

import { MessageBubble } from '../MessageBubble';

vi.mock('@/lib/api/endpoints', () => ({
  api: { models: { list: vi.fn().mockResolvedValue([]) }, feedback: { vote: vi.fn().mockResolvedValue(undefined) } },
}));

const msg = (over: Partial<Message> = {}): Message => ({
  id: 'a1',
  chat_id: 'c',
  seq: 1,
  role: 'assistant',
  content: 'Hello there',
  attachments: [],
  model_id: 'openrouter:z-ai/glm-5.3-flash',
  request_id: 'req_1',
  result_ref: null,
  tokens: 2,
  status: 'done',
  created_at: '2026-10-08T00:00:00Z',
  ...over,
});

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  useStreamStore.getState().clearAll();
  useUiStore.setState({ receiptRequestId: null });
});

describe('MessageBubble', () => {
  it('shows the model tag, receipt link and thumbs on a done reply', () => {
    wrap(<MessageBubble message={msg()} />);
    expect(screen.getByText(/glm-5.3-flash|GLM/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Receipt' }));
    expect(useUiStore.getState().receiptRequestId).toBe('req_1');
    expect(screen.getByRole('button', { name: 'Thumbs up' })).toBeInTheDocument();
  });

  it('shows the retry notice with no extra charge', () => {
    useStreamStore.getState().start('a1');
    useStreamStore.getState().retry('a1', { fromModelId: 'x', toModelId: 'openrouter:meta-llama/llama-3.3-70b', reason: 'timeout' });
    wrap(<MessageBubble message={msg()} />);
    expect(screen.getByRole('status')).toHaveTextContent(/Retrying on .* — no extra charge/);
  });

  it('offers rerun on the free model after an error', () => {
    useStreamStore.getState().start('a1');
    useStreamStore.getState().fail('a1', { code: 'provider_failed', message: 'Provider failed twice', canRerunFree: true });
    const onRerunFree = vi.fn();
    wrap(<MessageBubble message={msg()} onRerunFree={onRerunFree} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rerun on free model' }));
    expect(onRerunFree).toHaveBeenCalledWith('a1');
  });
});
