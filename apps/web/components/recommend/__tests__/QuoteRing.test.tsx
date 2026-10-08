import { act, render, screen } from '@testing-library/react';

import { QuoteRing } from '../QuoteRing';

describe('QuoteRing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down, warns under a minute and fires onExpired at zero', () => {
    const onExpired = vi.fn();
    const expiresAt = new Date(Date.now() + 61_000).toISOString();
    render(<QuoteRing expiresAt={expiresAt} onExpired={onExpired} />);
    expect(screen.getByRole('timer')).toHaveAttribute('data-state', 'ok');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('timer')).toHaveAttribute('data-state', 'warn');
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(screen.getByRole('timer')).toHaveAttribute('data-state', 'expired');
    expect(onExpired).toHaveBeenCalled();
  });
});
