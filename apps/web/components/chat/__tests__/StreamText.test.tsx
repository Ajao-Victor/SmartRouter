import { act, render, screen } from '@testing-library/react';

import { micro } from '@/lib/money';

import { useStreamStore } from '@/stores/streamStore';

import { StreamText } from '../StreamText';

beforeEach(() => {
  useStreamStore.getState().clearAll();
});

describe('StreamText', () => {
  it('renders history as markdown when there is no live stream', async () => {
    render(<StreamText messageId="m0" content={'**bold** and `code`'} />);
    expect((await screen.findByText('bold')).tagName).toBe('STRONG');
    expect(screen.getByText('code').tagName).toBe('CODE');
  });

  it('grows plainly while deltas arrive, then renders markdown on done', async () => {
    useStreamStore.getState().start('m1');
    const { container } = render(<StreamText messageId="m1" content="" />);
    act(() => {
      useStreamStore.getState().append('m1', 'Hello ');
      useStreamStore.getState().append('m1', '**world**');
    });
    const live = container.querySelector('p[aria-busy="true"]');
    expect(live).not.toBeNull();
    expect(live?.textContent).toBe('Hello **world**');
    act(() => {
      useStreamStore.getState().done('m1', { chargedUsd: micro(0), latencyMs: 10, requestId: 'r', files: [], citations: [] });
    });
    expect((await screen.findByText('world')).tagName).toBe('STRONG');
  });

  it('sanitises raw HTML in model output', async () => {
    render(<StreamText messageId="m2" content={'Hello <script>alert(1)</script> <b onclick="x">safe</b> <img src=x onerror=alert(1)>'} />);
    expect(await screen.findByText(/safe/)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
