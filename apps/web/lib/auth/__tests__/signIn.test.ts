import { ApiError } from '@/lib/api/client';
import { clearSessionToken, getSessionToken } from '@/lib/auth/session';

import { exchangeIdentityToken, isWalletNotReady, isWrongAccount, signOutEverywhere } from '../signIn';

const privy = vi.fn();
const logout = vi.fn();
vi.mock('@/lib/api/endpoints', () => ({
  api: { auth: { privy: (input: unknown) => privy(input) as Promise<unknown>, logout: () => logout() as Promise<unknown> } },
}));

const ok = { userId: 'u1', address: '0xabc', email: 'a@b.co', loginMethod: 'google', token: 'u1.999.sig', expiresAt: new Date(Date.now() + 86_400_000).toISOString() };

beforeEach(() => {
  vi.useFakeTimers();
  privy.mockReset();
  logout.mockReset();
  clearSessionToken();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Privy sign-in (Handover "Sign-in flow")', () => {
  it('exchanges the identity token and keeps the session token', async () => {
    privy.mockResolvedValue(ok);
    const res = await exchangeIdentityToken(() => Promise.resolve('id-token'));
    expect(privy).toHaveBeenCalledWith({ identityToken: 'id-token' });
    expect(res.address).toBe('0xabc');
    expect(getSessionToken()).toBe('u1.999.sig');
  });

  it('400 "No Privy embedded wallet yet": waits a second and retries with a fresh identity token', async () => {
    const notReady = new ApiError({ status: 400, code: 'VALIDATION_FAILED', message: 'No Privy embedded wallet yet — create it on login and retry' });
    privy.mockRejectedValueOnce(notReady).mockResolvedValueOnce(ok);
    const tokens = ['first', 'fresh'];
    const p = exchangeIdentityToken(() => Promise.resolve(tokens.shift() ?? null));
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(p).resolves.toMatchObject({ token: 'u1.999.sig' });
    expect(privy).toHaveBeenNthCalledWith(2, { identityToken: 'fresh' });
    expect(isWalletNotReady(notReady)).toBe(true);
  });

  it('403 "This wallet belongs to another account" is not retried', async () => {
    const forbidden = new ApiError({ status: 403, code: 'FORBIDDEN', message: 'This wallet belongs to another account' });
    privy.mockRejectedValue(forbidden);
    await expect(exchangeIdentityToken(() => Promise.resolve('t'))).rejects.toBe(forbidden);
    expect(privy).toHaveBeenCalledTimes(1);
    expect(isWrongAccount(forbidden)).toBe(true);
  });

  it('sign out: POST /auth/logout, then Privy logout(), then clear the stored token', async () => {
    privy.mockResolvedValue(ok);
    await exchangeIdentityToken(() => Promise.resolve('t'));
    const order: string[] = [];
    logout.mockImplementation(() => {
      order.push('api');
      return Promise.resolve({ ok: true });
    });
    await signOutEverywhere(() => {
      order.push('privy');
      expect(getSessionToken()).not.toBeNull();
      return Promise.resolve();
    });
    expect(order).toEqual(['api', 'privy']);
    expect(getSessionToken()).toBeNull();
  });
});
