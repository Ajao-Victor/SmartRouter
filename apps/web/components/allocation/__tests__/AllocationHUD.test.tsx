import { fireEvent, render, screen } from '@testing-library/react';

import type { SessionsCurrent } from '@/lib/api/types';
import { micro } from '@/lib/money';

import { useAllocationStore } from '@/stores/allocationStore';
import { useUiStore } from '@/stores/uiStore';
import { useUsageStore } from '@/stores/usageStore';

import { AllocationHUD } from '../AllocationHUD';
import { UsageBanner } from '../UsageBanner';

const current = (remainingUsd: number): SessionsCurrent => ({
  suggestedDepositUsd: micro(2_000_000),
  paidRunsEnabled: true, usage: null, network: { name: null, chainId: 42431, token: null, recipient: null, operator: null },
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

const usageAt = (level: 'warning' | 'critical' | 'exhausted', meter: 'weekly' | 'deposit', usedPct: number) => ({
  weekly: null,
  deposit: null,
  alert: { level, meter, usedPct, message: meter === 'weekly' ? `You've used ${String(usedPct)}% of your weekly limit` : `You've used ${String(usedPct)}% of your balance`, action: meter === 'weekly' ? ('raise_limit' as const) : ('top_up' as const) },
});

describe('UsageBanner (Handover "Usage banners")', () => {
  beforeEach(() => {
    useUsageStore.getState().reset();
  });

  it('renders nothing below 75% (alert: null)', () => {
    useUsageStore.getState().setUsage({ weekly: null, deposit: null, alert: null });
    const { container } = render(<UsageBanner onTopUp={vi.fn()} onRaiseLimit={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('warning (75%): "{message} · Get more usage", dismissible, action label button', () => {
    useUsageStore.getState().setUsage(usageAt('warning', 'weekly', 75));
    const onRaise = vi.fn();
    render(<UsageBanner onTopUp={vi.fn()} onRaiseLimit={onRaise} />);
    expect(screen.getByRole('status')).toHaveTextContent("You've used 75% of your weekly limit · Get more usage");
    fireEvent.click(screen.getByRole('button', { name: 'Raise limit' }));
    expect(onRaise).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('critical (90%) is not dismissible; top_up opens the deposit dialog', () => {
    useUsageStore.getState().setUsage(usageAt('critical', 'deposit', 92));
    const onTopUp = vi.fn();
    render(<UsageBanner onTopUp={onTopUp} onRaiseLimit={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent("You've used 92% of your balance");
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Top up' }));
    expect(onTopUp).toHaveBeenCalled();
  });

  it('exhausted (100%) offers the free model', () => {
    useUsageStore.getState().setUsage(usageAt('exhausted', 'deposit', 100));
    const onFree = vi.fn();
    render(<UsageBanner onTopUp={vi.fn()} onRaiseLimit={vi.fn()} onUseFree={onFree} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use the free model' }));
    expect(onFree).toHaveBeenCalled();
  });
});
