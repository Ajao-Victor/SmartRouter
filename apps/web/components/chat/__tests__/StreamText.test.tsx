import { act, render, screen } from '@testing-library/react';

import { useStreamStore } from '@/stores/streamStore';

import { StreamText } from '../StreamText';

beforeEach(() => {
  useStreamStore.getState().clearAll();
});

describe('StreamText', () => {
  it('renders history as markdown when there is no live stream', () => {
    render(<StreamText messageId="m0" content={'**bold** and `code`'} />);
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('code').tagName).toBe('CODE');
  });

  it('appends tokens in order while streaming, then renders markdown on done', async () => {
    useStreamStore.getState().start('m1');
    render(<StreamText messageId="m1" content="" />);
    await act(async () => {
      useStreamStore.getState().appendTokens('m1', ['Hello', ' ']);
      await new Promise((r) => requestAnimationFrame(() => { r(null); }));
    });
    await act(async () => {
      useStreamStore.getState().appendTokens('m1', ['**world**']);
      await new Promise((r) => requestAnimationFrame(() => { r(null); }));
    });
    expect(screen.getByText(/Hello/)).toHaveAttribute('aria-busy', 'true');
    act(() => {
      useStreamStore.getState().done('m1');
    });
    expect(screen.getByText('world').tagName).toBe('STRONG');
  });

  it('sanitises raw HTML in model output', () => {
    render(<StreamText messageId="m2" content={'<script>alert(1)</script><img src=x onerror=alert(1)> safe'} />);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(/safe/)).toBeInTheDocument();
  });
});
