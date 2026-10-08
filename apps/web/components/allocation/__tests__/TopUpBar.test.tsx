import { fireEvent, render, screen } from '@testing-library/react';

import { micro } from '@/lib/money';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

import { TopUpBar } from '../TopUpBar';

const wrap = (ui: React.ReactElement) => render(<ReducedMotionProvider forceReduced>{ui}</ReducedMotionProvider>);

describe('TopUpBar', () => {
  it('shows both PDF buttons side by side', () => {
    const onTopUp = vi.fn();
    const onContinueFree = vi.fn();
    wrap(<TopUpBar topUpMicro={micro(2_000_000)} onTopUp={onTopUp} onContinueFree={onContinueFree} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Allocation used — Top up $2');
    fireEvent.click(screen.getByRole('button', { name: 'Top up $2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue free' }));
    expect(onTopUp).toHaveBeenCalled();
    expect(onContinueFree).toHaveBeenCalled();
  });

  it('shows the auto-free notice when fallback is on', () => {
    wrap(<TopUpBar topUpMicro={micro(2_000_000)} onTopUp={vi.fn()} onContinueFree={vi.fn()} autoFree />);
    expect(screen.getByRole('status')).toHaveTextContent('Allocation used — continuing free');
  });

  it('disables Continue free when the free quota is exhausted', () => {
    wrap(<TopUpBar topUpMicro={micro(2_000_000)} onTopUp={vi.fn()} onContinueFree={vi.fn()} autoFree freeAvailable={false} />);
    expect(screen.getByRole('button', { name: 'Continue free' })).toBeDisabled();
  });
});
