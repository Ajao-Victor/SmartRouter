import type { SessionsCurrent } from '@/lib/api/types';
import { micro } from '@/lib/money';

import { selectCanAfford, selectIsLow, selectIsUsed, selectRemainingPct, useAllocationStore } from '../allocationStore';

const current = (over: Partial<NonNullable<SessionsCurrent['session']>> | null = {}): SessionsCurrent => ({
  paidRunsEnabled: true,
  suggestedDepositUsd: micro(2_000_000),
  network: null,
  usage: null,
  session:
    over === null
      ? null
      : { depositUsd: micro(2_000_000), spentUsd: micro(0), remainingUsd: micro(2_000_000), requests: 0, channelId: 'ch_1', status: 'open', openedAt: null, settledUsd: micro(0), lastUsedAt: null, ...over },
});

beforeEach(() => {
  useAllocationStore.getState().reset();
});

describe('allocationStore (mirrors GET /sessions/current)', () => {
  it('hydrates from a $2 session (PDF default)', () => {
    useAllocationStore.getState().hydrate(current());
    const s = useAllocationStore.getState();
    expect(s.status).toBe('open');
    expect(s.depositUsd).toBe(2_000_000);
    expect(s.remainingUsd).toBe(2_000_000);
    expect(selectRemainingPct(s)).toBe(1);
  });

  it('has no session before the first paid run and can afford up to the suggested deposit', () => {
    useAllocationStore.getState().hydrate(current(null));
    const s = useAllocationStore.getState();
    expect(s.status).toBe('none');
    expect(selectCanAfford(micro(1_000))(s)).toBe(true);
    expect(selectCanAfford(micro(2_000_001))(s)).toBe(false);
  });

  it('applies charges from done events, flags low below 10%, then used', () => {
    useAllocationStore.getState().hydrate(current());
    useAllocationStore.getState().applyCharge(micro(1_850_000));
    let s = useAllocationStore.getState();
    expect(s.remainingUsd).toBe(150_000);
    expect(s.requests).toBe(1);
    expect(selectIsLow(s)).toBe(true);
    expect(selectIsUsed(s)).toBe(false);

    useAllocationStore.getState().applyCharge(micro(150_000));
    s = useAllocationStore.getState();
    expect(s.remainingUsd).toBe(0);
    expect(s.status).toBe('used');
    expect(selectIsUsed(s)).toBe(true);
  });

  it('takes meta.remainingUsd as the freshest number', () => {
    useAllocationStore.getState().hydrate(current());
    useAllocationStore.getState().setRemaining(micro(500_000));
    expect(useAllocationStore.getState().remainingUsd).toBe(500_000);
  });

  it('canAfford follows the PDF rule price ≤ remaining', () => {
    useAllocationStore.getState().hydrate(current({ spentUsd: micro(1_999_000), remainingUsd: micro(1_000) }));
    const s = useAllocationStore.getState();
    expect(selectCanAfford(micro(1_000))(s)).toBe(true);
    expect(selectCanAfford(micro(1_100))(s)).toBe(false);
  });

  it('top-up and close cycles update status', () => {
    useAllocationStore.getState().hydrate(current({ spentUsd: micro(2_000_000), remainingUsd: micro(0) }));
    expect(useAllocationStore.getState().status).toBe('used');
    useAllocationStore.getState().beginTopUp();
    expect(useAllocationStore.getState().status).toBe('toppingUp');
    useAllocationStore.getState().hydrate(current({ depositUsd: micro(4_000_000), spentUsd: micro(2_000_000), remainingUsd: micro(2_000_000) }));
    expect(useAllocationStore.getState().status).toBe('open');
    useAllocationStore.getState().beginClose();
    expect(useAllocationStore.getState().status).toBe('closing');
    useAllocationStore.getState().reset();
    expect(useAllocationStore.getState().status).toBe('none');
  });

  it('closed sessions report closed', () => {
    useAllocationStore.getState().hydrate(current({ status: 'closed' }));
    expect(useAllocationStore.getState().status).toBe('closed');
  });
});
