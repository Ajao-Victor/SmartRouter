import { fireEvent, render, screen } from '@testing-library/react';

import type { UserSession } from '@/lib/api/types';
import { micro } from '@/lib/money';

import { useAllocationStore } from '@/stores/allocationStore';

import { AllocationHUD } from '../AllocationHUD';
import { FreeQuotaMeter } from '../FreeQuotaMeter';

const session = (over: Partial<UserSession> = {}): UserSession => ({
  channel_id: 'ch', user_id: 'u', authorized_signer: 's', deposit: micro(2_000_000), highest_voucher: micro(0), counted: micro(0), settled: micro(0), last_used_at: null, status: 'open', ...over,
});

beforeEach(() => {
  useAllocationStore.getState().reset();
});

describe('AllocationHUD', () => {
  it('offers to open an allocation when there is none', () => {
    const onOpen = vi.fn();
    render(<AllocationHUD allocationMicro={micro(2_000_000)} onTopUp={vi.fn()} onOpenAllocation={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Open allocation/ }));
    expect(onOpen).toHaveBeenCalled();
  });

  it('shows remaining in the ring and tops up from the panel', () => {
    useAllocationStore.getState().hydrateFromSession(session({ highest_voucher: micro(1_600_000) }));
    const onTopUp = vi.fn();
    render(<AllocationHUD allocationMicro={micro(2_000_000)} onTopUp={onTopUp} onOpenAllocation={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: /Allocation: \$0\.40 remaining/ });
    expect(screen.getByRole('meter')).toHaveAttribute('data-state', 'low');
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Top up $2' }));
    expect(onTopUp).toHaveBeenCalled();
  });

  it('marks used at zero', () => {
    useAllocationStore.getState().hydrateFromSession(session({ highest_voucher: micro(2_000_000) }));
    render(<AllocationHUD allocationMicro={micro(2_000_000)} onTopUp={vi.fn()} onOpenAllocation={vi.fn()} />);
    expect(screen.getByRole('meter')).toHaveAttribute('data-state', 'used');
  });
});

describe('FreeQuotaMeter', () => {
  it('reports usage and the limit', () => {
    render(<FreeQuotaMeter messages={30} />);
    expect(screen.getByRole('meter', { name: 'Free messages used today' })).toHaveAttribute('aria-valuenow', '30');
    expect(screen.getByText(/limit reached/)).toBeInTheDocument();
  });
});
