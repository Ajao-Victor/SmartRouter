import type { UserSession } from '@/lib/api/types';
import { micro } from '@/lib/money';

import {
  selectCanAfford,
  selectIsLow,
  selectIsUsed,
  selectRemainingPct,
  useAllocationStore,
} from '../allocationStore';

const session = (over: Partial<UserSession> = {}): UserSession => ({
  channel_id: 'ch_1',
  user_id: 'u_1',
  authorized_signer: '0xsigner',
  deposit: micro(2_000_000),
  highest_voucher: micro(0),
  counted: micro(0),
  settled: micro(0),
  last_used_at: null,
  status: 'open',
  ...over,
});

beforeEach(() => {
  useAllocationStore.getState().reset();
});

describe('allocationStore', () => {
  it('hydrates from a $2 session (PDF default)', () => {
    useAllocationStore.getState().hydrateFromSession(session());
    const s = useAllocationStore.getState();
    expect(s.status).toBe('open');
    expect(s.depositMicro).toBe(2_000_000);
    expect(s.remainingMicro).toBe(2_000_000);
    expect(selectRemainingPct(s)).toBe(1);
  });

  it('applies vouchers, flags low, then used', () => {
    useAllocationStore.getState().hydrateFromSession(session());
    useAllocationStore.getState().applyVoucher(micro(1_600_000));
    let s = useAllocationStore.getState();
    expect(s.remainingMicro).toBe(400_000);
    expect(selectIsLow(s)).toBe(true);
    expect(selectIsUsed(s)).toBe(false);

    useAllocationStore.getState().applyVoucher(micro(400_000));
    s = useAllocationStore.getState();
    expect(s.remainingMicro).toBe(0);
    expect(s.status).toBe('used');
    expect(selectIsUsed(s)).toBe(true);
  });

  it('restores a voucher whose run delivered no result', () => {
    useAllocationStore.getState().hydrateFromSession(session());
    useAllocationStore.getState().applyVoucher(micro(2_000_000));
    useAllocationStore.getState().restoreVoucher(micro(2_000_000));
    const s = useAllocationStore.getState();
    expect(s.remainingMicro).toBe(2_000_000);
    expect(s.status).toBe('open');
  });

  it('canAfford follows the PDF rule quote ≤ remaining', () => {
    useAllocationStore.getState().hydrateFromSession(session({ highest_voucher: micro(1_999_000) }));
    const s = useAllocationStore.getState();
    expect(selectCanAfford(micro(1_000))(s)).toBe(true);
    expect(selectCanAfford(micro(1_100))(s)).toBe(false);
  });

  it('top-up cycle updates status and deposit', () => {
    useAllocationStore.getState().hydrateFromSession(session({ highest_voucher: micro(2_000_000) }));
    expect(useAllocationStore.getState().status).toBe('used');
    useAllocationStore.getState().beginTopUp();
    expect(useAllocationStore.getState().status).toBe('toppingUp');
    useAllocationStore
      .getState()
      .endTopUp(session({ deposit: micro(4_000_000), highest_voucher: micro(2_000_000) }));
    const s = useAllocationStore.getState();
    expect(s.status).toBe('open');
    expect(s.remainingMicro).toBe(2_000_000);
  });

  it('closed sessions report closed', () => {
    useAllocationStore.getState().hydrateFromSession(session({ status: 'closed' }));
    expect(useAllocationStore.getState().status).toBe('closed');
  });
});
