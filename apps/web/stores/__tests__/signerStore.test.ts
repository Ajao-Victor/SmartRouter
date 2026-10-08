import { micro } from '@/lib/money';

import { selectSignerReady, useSignerStore, VoucherCapError } from '../signerStore';

beforeEach(() => {
  useSignerStore.getState().reset();
});

describe('signerStore', () => {
  it('starts not ready and holds no key material', () => {
    const s = useSignerStore.getState();
    expect(selectSignerReady(s)).toBe(false);
    expect(Object.keys(s)).not.toContain('privateKey');
  });

  it('advances the cumulative total up to the deposit', () => {
    useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(1_000) });
    expect(useSignerStore.getState().advance(micro(400))).toBe(400);
    expect(useSignerStore.getState().advance(micro(600))).toBe(1_000);
    expect(() => useSignerStore.getState().advance(micro(1))).toThrow(VoucherCapError);
    expect(useSignerStore.getState().cumulativeMicro).toBe(1_000);
  });

  it('rolls back reservations that delivered no result', () => {
    useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(1_000) });
    useSignerStore.getState().advance(micro(700));
    useSignerStore.getState().rollback(micro(700));
    expect(useSignerStore.getState().cumulativeMicro).toBe(0);
  });

  it('raises the cap after a top-up without resetting the total', () => {
    useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(1_000) });
    useSignerStore.getState().advance(micro(1_000));
    useSignerStore.getState().setDeposit(micro(2_000));
    expect(useSignerStore.getState().advance(micro(500))).toBe(1_500);
  });

  it('rejects negative prices', () => {
    useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(1_000) });
    expect(() => useSignerStore.getState().advance(micro(-1))).toThrow(RangeError);
  });
});
