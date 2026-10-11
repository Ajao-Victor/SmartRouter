import { fireEvent, render, screen } from '@testing-library/react';

import type { SessionsCurrent } from '@/lib/api/types';
import { micro } from '@/lib/money';

import { useAllocationStore } from '@/stores/allocationStore';
import { useUiStore } from '@/stores/uiStore';

import { AllocationHUD } from '../AllocationHUD';
import { LowBalanceBanner } from '../LowBalanceBanner';

const current = (remainingUsd: number): SessionsCurrent => ({
  suggestedDepositUsd: micro(2_000_000),
  network: 'moderato',
  session: { depositUsd: micro(2_000_000), spentUsd: micro(2_000_000 - remainingUsd), remainingUsd: micro(remainingUsd), requests: 1, channelId: 'ch', status: 'open', openedAt: null },
});

beforeEach(() => {
  useAllocationStore.getState().reset();
  useUiStore.setState({ walletSheetOpen: false });
});

describe('AllocationHUD', () => {
  it('says Wallet before the first paid run and opens the wallet sheet', () => {
    render(<AllocationHUD />);
    fireEvent.click(screen.getByRole('button', { name: 'Wallet' }));
    expect(useUiStore.getState().walletSheetOpen).toBe(true);
  });

  it('shows the remaining deposit from /sessions/current', () => {
    useAllocationStore.getState().hydrate(current(400_000));
    render(<AllocationHUD />);
    expect(screen.getByRole('button', { name: 'Allocation: $0.40 remaining of $2.00' })).toHaveTextContent('$0.40');
  });
});

describe('LowBalanceBanner', () => {
  it('appears below 10% of the deposit or below the next price', () => {
    useAllocationStore.getState().hydrate(current(150_000));
    const onTopUp = vi.fn();
    const { rerender } = render(<LowBalanceBanner onTopUp={onTopUp} />);
    expect(screen.getByRole('status')).toHaveTextContent('Your balance is running low');
    fireEvent.click(screen.getByRole('button', { name: 'Top up' }));
    expect(onTopUp).toHaveBeenCalled();

    useAllocationStore.getState().hydrate(current(1_000_000));
    rerender(<LowBalanceBanner onTopUp={onTopUp} nextPriceUsd={micro(1_500_000)} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<LowBalanceBanner onTopUp={onTopUp} nextPriceUsd={micro(900)} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
