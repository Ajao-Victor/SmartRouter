import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { micro } from '@/lib/money';

import { useAllocationStore } from '@/stores/allocationStore';
import { useUiStore } from '@/stores/uiStore';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

import { AllocationControls } from '../AllocationControls';
import { WaitlistForm } from '../WaitlistForm';
import { WalletSheet } from '../WalletSheet';

const join = vi.fn();
vi.mock('@/lib/api/endpoints', () => ({ api: { waitlist: { join: (i: unknown) => join(i) as Promise<void> } } }));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ReducedMotionProvider forceReduced>{ui}</ReducedMotionProvider>
    </QueryClientProvider>,
  );
}

const user = { address: '0x7a3f9c1e5b2d4a6f8e0c1b3d5f7a9c2e4b6d8f01', slider: 'balanced' as const, allocationUsd: micro(2_000_000), weeklyLimitUsd: micro(10_000_000), autoFreeFallback: true, freeRemaining: null, id: 'user_1', email: 'a@b.co', loginMethod: 'email', usage: null, country: null };

describe('WaitlistForm', () => {
  it('validates the email and posts email, country and interest', async () => {
    join.mockResolvedValue(undefined);
    wrap(<WaitlistForm interest="naira" />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } });
    fireEvent.submit(screen.getByRole('button', { name: /Join the naira waitlist/ }).closest('form') as HTMLFormElement);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /Join the naira waitlist/ }).closest('form') as HTMLFormElement);
    await waitFor(() => {
      expect(join).toHaveBeenCalledWith({ email: 'ada@example.com', country: 'NG', interest: 'naira' });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/on the waitlist/);
  });
});

describe('AllocationControls (PATCH /me/settings)', () => {
  it('steps allocation and weekly limit in USD and toggles auto free fallback', () => {
    const onChange = vi.fn();
    wrap(<AllocationControls allocationUsd={micro(2_000_000)} weeklyLimitUsd={micro(10_000_000)} autoFreeFallback onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase Allocation size' }));
    expect(onChange).toHaveBeenCalledWith({ allocationUsd: 3 });
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Spending limit' }));
    expect(onChange).toHaveBeenCalledWith({ weeklyLimitUsd: 5 });
    fireEvent.click(screen.getByRole('switch', { name: 'Auto free fallback' }));
    expect(onChange).toHaveBeenCalledWith({ autoFreeFallback: false });
  });
});

describe('WalletSheet (payment session)', () => {
  beforeEach(() => {
    useAllocationStore.getState().reset();
    useUiStore.setState({ walletSheetOpen: true, sdkDialogOpen: false });
  });

  it('explains the first deposit when there is no session', () => {
    const onTopUp = vi.fn();
    wrap(<WalletSheet user={user} onTopUp={onTopUp} onCloseSession={vi.fn()} onSignOut={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText(/No deposit yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deposit $2' }));
    expect(onTopUp).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Close and withdraw' })).toBeNull();
  });

  it('shows deposit, spent, remaining and offers Top up and Close on an open session', () => {
    useAllocationStore.getState().hydrate({ suggestedDepositUsd: micro(2_000_000), paidRunsEnabled: true, usage: null, network: { name: null, chainId: 42431, token: null, recipient: null, operator: null }, session: { depositUsd: micro(2_000_000), spentUsd: micro(500_000), remainingUsd: micro(1_500_000), requests: 3, channelId: 'ch', status: 'open', openedAt: null } });
    const onClose = vi.fn();
    wrap(<WalletSheet user={user} onTopUp={vi.fn()} onCloseSession={onClose} onSignOut={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText('$0.50')).toBeInTheDocument();
    expect(screen.getByText('$1.50')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New deposit' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close and withdraw' }));
    expect(onClose).toHaveBeenCalled();
  });
});
