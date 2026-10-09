import type { UserSession } from '@/lib/api/types';
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

  it('persists only public bookkeeping, never key material', () => {
    const partialize = useSignerStore.persist.getOptions().partialize;
    expect(partialize).toBeDefined();
    useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(1_000), cumulativeMicro: micro(250) });
    expect(partialize?.(useSignerStore.getState())).toEqual({ publicKey: 'pk', channelId: 'ch', cumulativeMicro: 250, depositMicro: 1_000 });
    expect(useSignerStore.persist.getOptions().name).toBe('sr:signer');
  });

  describe('reconcile', () => {
    const session = (over: Partial<UserSession> = {}): UserSession => ({
      channel_id: 'ch',
      user_id: 'u1',
      authorized_signer: 'pk',
      deposit: micro(2_000),
      highest_voucher: micro(700),
      counted: micro(700),
      settled: micro(0),
      status: 'open',
      last_used_at: '2026-10-08T00:00:00Z',
      ...over,
    });

    it('re-bases the total on the server highest voucher after a reload', () => {
      useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(1_000), cumulativeMicro: micro(300) });
      useSignerStore.getState().reconcile(session());
      expect(useSignerStore.getState().cumulativeMicro).toBe(700);
      expect(useSignerStore.getState().depositMicro).toBe(2_000);
    });

    it('keeps a local reservation the server has not seen yet', () => {
      useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(2_000), cumulativeMicro: micro(900) });
      useSignerStore.getState().reconcile(session());
      expect(useSignerStore.getState().cumulativeMicro).toBe(900);
    });

    it('clears the signer when the session is gone, closed or another channel', () => {
      for (const s of [null, session({ status: 'closed' }), session({ channel_id: 'other' })]) {
        useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(1_000) });
        useSignerStore.getState().reconcile(s);
        expect(selectSignerReady(useSignerStore.getState())).toBe(false);
      }
    });

    it('is a no-op before any signer exists', () => {
      useSignerStore.getState().reconcile(session());
      expect(selectSignerReady(useSignerStore.getState())).toBe(false);
    });
  });
});
