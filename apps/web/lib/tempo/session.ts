/**
 * Paying for runs (Handover "Paying for runs"). One `sessionManager` per signed-in user, built on
 * a viem wallet client over the Privy embedded wallet, with `maxDeposit` = the deposit the user
 * chose (default `suggestedDepositUsd`). The first paid run opens the deposit on-chain (the one
 * approval); later runs sign a voucher with no prompt.
 *
 * - One paid run at a time: `paidFetch` queues calls (`paidRun`) so a second Send waits instead
 *   of failing; the lock lifts as soon as the answer starts streaming.
 * - When the deposit runs out: `manager.close()` (treasury receives what was spent, the rest
 *   returns), then a new manager with the new `maxDeposit`. `manager.topUp` is not used in v1:
 *   `maxDeposit` is a fixed local cap, so vouchers would still stop at the old cap.
 */
import { createJsonChannelStore, sessionManager } from 'mppx/client';
import { createWalletClient, custom, type EIP1193Provider } from 'viem';

import { ApiError, apiRequest } from '@/lib/api/client';
import { env } from '@/lib/env';
import { idb } from '@/lib/idb';
import { toUsdString, type MicroUsd } from '@/lib/money';

import { chainFor } from './chain';
import { getPrivyWallet } from './privyWallet';

export type SessionManager = ReturnType<typeof sessionManager>;

/** Reusable channels survive reloads, namespaced per wallet so two accounts never share one. */
function channelStoreFor(address: string) {
  const prefix = `sr:channel:${address.toLowerCase()}:`;
  return createJsonChannelStore({
    get: (key) => idb.get<string>(`${prefix}${key}`),
    set: (key, value) => idb.set(`${prefix}${key}`, value),
    delete: (key) => idb.del(`${prefix}${key}`),
  });
}

/** Handover: `fetch: (url, init) => api(String(url).replace(API_URL, ''), init)` — adds X-Session-Token. */
const managerFetch: typeof fetch = (input, init) => {
  if (input instanceof Request) {
    const path = input.url.replace(env.apiUrl, '');
    return apiRequest(path, { method: input.method, headers: input.headers, body: input.body, signal: input.signal, ...init });
  }
  return apiRequest(String(input).replace(env.apiUrl, ''), init);
};

interface Configured {
  manager: SessionManager;
  address: string;
  maxDepositUsd: MicroUsd;
}

let configured: Configured | null = null;
let last: Promise<unknown> = Promise.resolve();

/**
 * Create (or reuse) the manager for the signed-in Privy wallet. A different deposit amount only
 * takes effect after `closeSession()` — the open deposit keeps its cap.
 */
export async function ensureSession(args: { maxDepositUsd: MicroUsd; chainId?: number | null }): Promise<SessionManager | null> {
  if (env.mock) return null;
  const wallet = getPrivyWallet();
  if (!wallet) throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Sign in to run paid models.' });
  if (configured && configured.address.toLowerCase() === wallet.address.toLowerCase()) return configured.manager;

  const chain = chainFor(args.chainId ?? env.chainId);
  await wallet.switchChain?.(chain.id);
  const provider = (await wallet.getEthereumProvider()) as EIP1193Provider;
  const client = createWalletClient({ account: wallet.address as `0x${string}`, chain, transport: custom(provider) });
  const manager = sessionManager({
    account: client.account,
    client,
    maxDeposit: toUsdString(args.maxDepositUsd), // e.g. '2' = $2 of USDC.e
    fetch: managerFetch,
    allowedChainIds: [chain.id],
    channelStore: channelStoreFor(wallet.address),
    bootstrap: true,
  });
  configured = { manager, address: wallet.address, maxDepositUsd: args.maxDepositUsd };
  return manager;
}

export function getSessionManager(): SessionManager | null {
  return configured?.manager ?? null;
}

/** Forget the manager (sign-out, or before opening a new deposit). */
export function resetSession(): void {
  configured = null;
  last = Promise.resolve();
}

/** Whether a paid call can be made right now (manager configured, or mocks). */
export function isPaymentReady(): boolean {
  return env.mock || configured !== null;
}

/**
 * `paidRun`: queue paid calls per manager; the next run waits for this one's payment step only,
 * not for its whole stream. On mocks the request is a plain `apiRequest` (MSW answers).
 */
export function paidFetch(path: string, init?: RequestInit): Promise<Response> {
  if (env.mock) return apiRequest(path, init);
  const manager = configured?.manager;
  if (!manager) return Promise.reject(new ApiError({ status: 0, code: 'PAYMENT_REQUIRED', message: 'Sign in to run paid models.' }));
  const res = last.then(() => manager.fetch(`${env.apiUrl}${path}`, init));
  last = res.catch(() => undefined);
  return res;
}

/** Mock-only route (MSW) standing in for the on-chain close the manager performs. */
async function mockClose(): Promise<void> {
  const res = await apiRequest('/mock/session/close', { method: 'POST', body: '{}' });
  if (!res.ok) throw new ApiError({ status: res.status, code: 'PAYMENT_REQUIRED', message: 'Mock session call failed' });
}

/**
 * Close the open deposit: settles on-chain — the treasury receives what was spent and the rest
 * returns to the user. The manager is dropped so the next paid run opens a fresh deposit.
 */
export async function closeSession(args?: { maxDepositUsd: MicroUsd; chainId?: number | null }): Promise<void> {
  if (env.mock) {
    await mockClose();
    return;
  }
  // After a reload there may be no manager yet; build one so it can recover and close the channel.
  const manager = configured?.manager ?? (args ? await ensureSession(args) : null);
  try {
    if (manager) await manager.close();
  } finally {
    resetSession();
  }
}

export { toPaymentError } from './paymentErrors';
