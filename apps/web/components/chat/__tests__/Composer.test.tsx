import { fireEvent, render, screen } from '@testing-library/react';

import { micro } from '@/lib/money';

import { useComposerStore } from '@/stores/composerStore';
import { useToastStore } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

import { Composer } from '../Composer';

beforeEach(() => {
  useComposerStore.getState().reset();
  useToastStore.getState().clear();
  useUiStore.setState({ activeDialog: null, compareMode: false });
});

describe('Composer', () => {
  it('asks for a quote when there is none, then runs once quoted', () => {
    const onGetQuote = vi.fn();
    const onRun = vi.fn();
    const { rerender } = render(
      <Composer mode="chat" quote={null} currentModel={null} onGetQuote={onGetQuote} onRun={onRun} floating={false} />,
    );
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'Write a poem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Get quote' }));
    expect(onGetQuote).toHaveBeenCalledWith('Write a poem');

    rerender(
      <Composer
        mode="chat"
        quote={{ price: micro(900), expiresAt: new Date(Date.now() + 300_000).toISOString(), isFree: false }}
        currentModel={{ label: 'GLM 5.3 Flash', isFree: false }}
        onGetQuote={onGetQuote}
        onRun={onRun}
        floating={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Run/ })).toHaveTextContent('$0.0009');
    fireEvent.keyDown(screen.getByLabelText('Prompt'), { key: 'Enter', metaKey: true });
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('rejects disallowed attachments with a toast and keeps allowed ones', () => {
    render(<Composer mode="new" quote={null} currentModel={null} onGetQuote={vi.fn()} onRun={vi.fn()} floating={false} />);
    const input = screen.getByLabelText('Attach files');
    const bad = new File(['x'], 'virus.exe', { type: 'application/x-msdownload' });
    const good = new File(['x'], 'brief.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [bad, good] } });
    expect(useComposerStore.getState().attachments.map((f) => f.name)).toEqual(['brief.pdf']);
    expect(useToastStore.getState().items[0]?.title).toMatch(/not supported/);
    fireEvent.click(screen.getByRole('button', { name: 'Remove brief.pdf' }));
    expect(useComposerStore.getState().attachments).toHaveLength(0);
  });

  it('opens the model picker from the pill and toggles compare', () => {
    render(<Composer mode="chat" quote={null} currentModel={{ label: 'Free · Llama 3.1 8B', isFree: true }} onGetQuote={vi.fn()} onRun={vi.fn()} floating={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Model: Free · Llama 3.1 8B/ }));
    expect(useUiStore.getState().activeDialog).toBe('modelPicker');
    fireEvent.click(screen.getByRole('button', { name: 'Compare two models' }));
    expect(useUiStore.getState().compareMode).toBe(true);
  });
});
