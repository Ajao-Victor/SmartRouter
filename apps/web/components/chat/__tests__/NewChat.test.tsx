import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { micro } from '@/lib/money';

import { useComposerStore } from '@/stores/composerStore';

import { ChatList } from '../ChatList';
import { NewChat } from '../NewChat';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const create = vi.fn();
vi.mock('@/lib/api/endpoints', () => ({
  api: { chats: { create: (input: unknown) => create(input) as Promise<unknown>, list: vi.fn() }, me: { get: vi.fn().mockResolvedValue({ address: '0x', slider: 'balanced', allocationUsd: 2_000_000, weeklyLimitUsd: 10_000_000, autoFreeFallback: true, freeRemaining: null }) } },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  useComposerStore.getState().reset();
  push.mockClear();
  create.mockReset();
});

const option = { modelId: 'm', label: 'M', provider: 'P', quoteId: 'q1', priceUsd: micro(900), speed: 'fast', reason: 'r', free: false, quality: null, bestQuality: false, expiresAt: new Date(Date.now() + 300_000).toISOString() };

describe('NewChat (POST /chats)', () => {
  it('creates a chat from a selected category', async () => {
    create.mockResolvedValue({ chatId: 'chat_1', options: [], taskType: 'coding', title: null });
    wrap(<NewChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Coding' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));
    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ taskType: 'coding' }));
    });
    expect(push).toHaveBeenCalledWith('/chat/chat_1');
  });

  it('creates a chat from a description and hands the options to the workspace', async () => {
    create.mockResolvedValue({ chatId: 'chat_2', options: [option], taskType: 'writing', title: 'Write a cover letter' });
    wrap(<NewChat />);
    fireEvent.change(screen.getByLabelText('Describe the task'), { target: { value: 'Write a cover letter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Get options' }));
    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ description: 'Write a cover letter' }));
    });
    expect(push).toHaveBeenCalledWith('/chat/chat_2');
    expect(useComposerStore.getState().pendingOptions).toEqual({ chatId: 'chat_2', prompt: 'Write a cover letter', options: [option] });
  });

  it('honours a preselected category from the URL', async () => {
    create.mockResolvedValue({ chatId: 'chat_3', options: [], taskType: 'image', title: null });
    wrap(<NewChat initialCategory="image" />);
    expect(screen.getByRole('button', { name: 'Image' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));
    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ taskType: 'image' }));
    });
  });
});

describe('ChatList', () => {
  it('renders rows with title, task, spend and count', () => {
    wrap(
      <ChatList
        chats={[
          { id: 'c1', title: 'Cover letter for Paystack', taskType: 'writing', slider: 'balanced', currentModelId: null, messageCount: 2, spentUsd: micro(900), createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: /Cover letter for Paystack/ })).toHaveAttribute('href', '/chat/c1');
    expect(screen.getByText(/Writing · 2 messages/)).toBeInTheDocument();
    expect(screen.getByText('$0.0009')).toBeInTheDocument();
  });
});
