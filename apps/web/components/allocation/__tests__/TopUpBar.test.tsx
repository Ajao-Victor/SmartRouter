import { fireEvent, render, screen } from '@testing-library/react';

import { micro } from '@/lib/money';

import { TopUpBar } from '../TopUpBar';

describe('TopUpBar', () => {
  it('shows the PDF copy with Top up and Continue free side by side', () => {
    const onTopUp = vi.fn();
    const onContinueFree = vi.fn();
    render(<TopUpBar topUpUsd={micro(2_000_000)} onTopUp={onTopUp} onContinueFree={onContinueFree} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Allocation used — Top up $2');
    fireEvent.click(screen.getByRole('button', { name: 'Top up $2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue free' }));
    expect(onTopUp).toHaveBeenCalled();
    expect(onContinueFree).toHaveBeenCalled();
  });

  it('disables Continue free when details.freeFallback says the quota is used up', () => {
    render(<TopUpBar topUpUsd={micro(2_000_000)} onTopUp={vi.fn()} onContinueFree={vi.fn()} freeAvailable={false} />);
    expect(screen.getByRole('button', { name: 'Continue free' })).toBeDisabled();
    expect(screen.getByText(/reset at 00:00 UTC/)).toBeInTheDocument();
  });

  it('explains a weekly limit without offering a top-up', () => {
    render(<TopUpBar topUpUsd={micro(2_000_000)} onTopUp={vi.fn()} onContinueFree={vi.fn()} reason="weekly_limit" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Weekly spending limit reached');
    expect(screen.queryByRole('button', { name: /Top up/ })).toBeNull();
  });
});
