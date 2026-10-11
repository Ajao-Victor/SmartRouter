/**
 * Payment session (PDF "Paying for runs"): one `sessionManager` per signed-in user. The manager
 * does the 402 handshake, opens the escrow channel on the first paid call (the deposit, one
 * wallet approval), signs a voucher per paid run, tops up and closes. `paidRun` queues paid
 * calls so only one payment step is in flight (mppx throws otherwise); the lock is released as
 * soon as the answer starts streaming.
 */
import { createJsonChannelStore, sessionManager } from 'mppx/client';

import { ApiError, apiUrl } from '@/lib/api/client';
import { env } from '@/lib/env';
import { idb } from '@/lib/idb';
import { toUsdString, type MicroUsd } from '@/lib/money';

import type { AccessKeyAccount } from './accessKey';
import { getChainClient } from './chain';

export type SessionManager = ReturnType<typeof sessionManager>;

const CHANNEL_PREFIX = 'sr:channel:';

/** Reusable channels survive reloads (keyed by payee/token/escrow/chain). */
const channelStore = createJsonChannelStore({
  get: (key) => idb.get<string>(`${CHANNEL_PREFIX}${key}`),
  set: (key, value) => idb.set(`${CHANNEL_PREFIX}${key}`, value),
  delete: (key) => idb.del(`${CHANNEL_PREFIX}${key}`),
});

/** Cookie-carrying fetch for the manager's probes, payments and paid retries. */
export const credentialedFetch: typeof fetch = (input, init) => fetch(input, { ...init, credentials: 'include' });

interface Configured {
  manager: SessionManager;
  address: string;
  maxDepositUsd: MicroUsd;
}

let configured: Configured | null = null;
let last: Promise<unknown> = Promise.resolve();

/**
 * (Re)create the manager for the signed-in account. `maxDepositUsd` is the user's allocation —
 * the manager never deposits more than this, and throws locally when a run would exceed it.
 */
export function configureSession(args: { account: AccessKeyAccount; maxDepositUsd: MicroUsd }): SessionManager {
  if (configured && configured.address === args.account.address && configured.maxDepositUsd === args.maxDepositUsd) return configured.manager;
  const manager = sessionManager({
    account: args.account,
    client: getChainClient(),
    allowedChainIds: [env.chainId],
    maxDeposit: toUsdString(args.maxDepositUsd),
    topUpAmount: toUsdString(args.maxDepositUsd),
    fetch: credentialedFetch,
    channelStore,
    bootstrap: true,
  });
  configured = { manager, address: args.account.address, maxDepositUsd: args.maxDepositUsd };
  return manager;
}

export function getSessionManager(): SessionManager | null {
  return configured?.manager ?? null;
}

export function resetSession(): void {
  configured = null;
  last = Promise.resolve();
}

/** Whether a paid call can be made right now (signed in + manager configured, or mocks). */
export function isPaymentReady(): boolean {
  return env.mock || configured !== null;
}

/**
 * PDF `paidRun`: queue paid calls per session; the next run waits for this one's payment step
 * only, not for its whole stream. On mocks the request is a plain fetch (MSW answers).
 */
export function paidFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  if (env.mock) return credentialedFetch(input, init);
  const manager = configured?.manager;
  if (!manager) return Promise.reject(new ApiError({ status: 0, code: 'PAYMENT_REQUIRED', message: 'Sign in with your wallet to run paid models.' }));
  const res = last.then(() => manager.fetch(input, init));
  last = res.catch(() => undefined);
  return res;
}

/** Mock-only routes (MSW) standing in for the on-chain top-up / close the manager performs. */
async function mockSessionCall(action: 'top-up' | 'close', body: unknown): Promise<void> {
  const res = await credentialedFetch(apiUrl(`/mock/session/`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new ApiError({ status: res.status, code: 'PAYMENT_REQUIRED', message: 'Mock session call failed' });
}

/** User-initiated only (PDF: no automatic top-ups). */
export async function topUpSession(amountUsd: MicroUsd): Promise<void> {
  if (env.mock) {
    await mockSessionCall('top-up', { amountUsd: toUsdString(amountUsd) });
    return;
  }
  const manager = configured?.manager;
  if (!manager) throw new ApiError({ status: 0, code: 'PAYMENT_REQUIRED', message: 'No payment session yet. Run a paid model first to open one.' });
  await manager.topUp(toUsdString(amountUsd));
}

/** Closes the channel; the unspent deposit returns to the wallet. */
export async function closeSession(): Promise<void> {
  if (env.mock) {
    await mockSessionCall('close', {});
    return;
  }
  const manager = configured?.manager;
  if (!manager) return;
  await manager.close();
}

/**
 * Map mppx client-side errors (thrown before any request is sent) to PDF semantics:
 * "exceeds local maxDeposit" → ALLOCATION_EXHAUSTED, "already in flight" → SESSION_BUSY,
 * wallet rejection → PAYMENT_CANCELLED (nothing was charged).
 */
export function toPaymentError(err: unknown): ApiError | null {
  if (err instanceof ApiError) return err;
  if (!(err instanceof Error)) return null;
  const m = err.message;
  if (/exceeds local maxDeposit/i.test(m)) return new ApiError({ status: 402, code: 'ALLOCATION_EXHAUSTED', message: 'Your allocation cannot cover this run.', details: err });
  if (/already in flight/i.test(m)) return new ApiError({ status: 0, code: 'SESSION_BUSY', message: 'A payment is already in progress. Try again in a moment.', details: err });
  if (/reject|cancel|denied|abort|not allowed|NotAllowedError/i.test(m) || err.name === 'NotAllowedError') {
    return new ApiError({ status: 0, code: 'PAYMENT_CANCELLED', message: 'Payment cancelled — nothing was charged.', details: err });
  }
  if (/insufficient|balance/i.test(m)) return new ApiError({ status: 402, code: 'PAYMENT_REQUIRED', message: 'Your wallet balance is too low to open the session. Fund it first.', details: err });
  return null;
}
