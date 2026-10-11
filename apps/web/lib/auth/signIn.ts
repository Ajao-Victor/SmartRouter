/**
 * Shared sign-in steps (Handover "Sign-in flow", steps 3–5 and "Edge cases"), used by the Privy
 * bridge and the offline mock bridge.
 */
import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import type { PrivySignIn } from '@/lib/api/types';

import { clearSessionToken, setSessionToken } from './session';

/** 400 "No Privy embedded wallet yet": Privy hasn't finished creating the wallet. */
export function isWalletNotReady(err: unknown): boolean {
  return isApiError(err) && err.status === 400 && /no privy embedded wallet/i.test(err.message);
}

/** 403 "This wallet belongs to another account". */
export function isWrongAccount(err: unknown): boolean {
  return isApiError(err) && err.code === 'FORBIDDEN';
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const WALLET_RETRY_MS = 1_000;
export const WALLET_RETRY_ATTEMPTS = 10;

/**
 * `POST /auth/privy { identityToken }` → keep `token` (memory + localStorage). On "No Privy
 * embedded wallet yet", wait a second and call again with a fresh identity token.
 */
export async function exchangeIdentityToken(freshIdentityToken: () => Promise<string | null>): Promise<PrivySignIn> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < WALLET_RETRY_ATTEMPTS; attempt++) {
    const identityToken = await freshIdentityToken();
    if (identityToken) {
      try {
        const res = await api.auth.privy({ identityToken });
        setSessionToken(res.token, res.expiresAt);
        return res;
      } catch (err) {
        if (!isWalletNotReady(err)) throw err;
        lastErr = err;
      }
    }
    await sleep(WALLET_RETRY_MS);
  }
  throw lastErr instanceof Error ? lastErr : new Error('Your wallet is still being set up. Try signing in again.');
}

/** Sign out (Handover): `POST /auth/logout`, then Privy's `logout()`, then clear the stored token. */
export async function signOutEverywhere(logoutPrivy: () => Promise<void>): Promise<void> {
  try {
    await api.auth.logout();
  } catch {
    /* the server session may already be gone */
  }
  try {
    await logoutPrivy();
  } finally {
    clearSessionToken();
  }
}
