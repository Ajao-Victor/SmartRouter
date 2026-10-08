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
  api: { chats: { create: (input: unknown) => create(input) as Promise<unknown>, list: vi.fn() } },
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

describe('NewChat', () => {
  it('creates a chat from a selected category', async () => {
    create.mockResolvedValue({ id: 'chat_1' });
    wrap(<NewChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Coding' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));
    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({ task_type: 'coding' });
    });
    expect(push).toHaveBeenCalledWith('/chat/chat_1');
  });

  it('creates a chat from a description and routes with ?first=1', async () => {
    create.mockResolvedValue({ id: 'chat_2' });
    wrap(<NewChat />);
    fireEvent.change(screen.getByLabelText('Or describe the task'), { target: { value: 'Write a cover letter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Get a quote' }));
    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({ first_prompt: 'Write a cover letter' });
    });
    expect(push).toHaveBeenCalledWith('/chat/chat_2?first=1');
    expect(useComposerStore.getState().draft).toBe('Write a cover letter');
  });

  it('honours a preselected category from the URL', async () => {
    create.mockResolvedValue({ id: 'chat_3' });
    wrap(<NewChat initialCategory="image" />);
    expect(screen.getByRole('button', { name: 'Image' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));
    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({ task_type: 'image' });
    });
  });
});

describe('ChatList', () => {
  it('renders rows with title, task, spend and count', () => {
    wrap(
      <ChatList
        chats={[
          {
            id: 'c1',
            user_id: 'u',
            title: 'Cover letter for Paystack',
            task_type: 'writing',
            slider: 'balanced',
            current_model_id: null,
            summary: null,
            message_count: 2,
            spent: micro(900),
            created_at: '2026-10-08T00:00:00Z',
            updated_at: '2026-10-08T00:00:00Z',
          },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Cover letter for Paystack' })).toBeInTheDocument();
    expect(screen.getByText('writing')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
  });
});
