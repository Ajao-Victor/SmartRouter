/**
 * On-chain wallet actions the PDF leaves to the user's own wallet: read the escrow token balance
 * (pathUSD on Moderato, USDC.e on mainnet), fund a testnet account from the faucet, and send
 * tokens to another address. All go through viem/tempo on the public RPC; the signing account is
 * the signed-in passkey root (one prompt per send). Loaded lazily — viem/tempo is heavy.
 *
 * On `NEXT_PUBLIC_MOCK=1` a small in-memory ledger stands in so the UI runs offline.
 */
import { env, isTestnet } from '@/lib/env';
import { idb } from '@/lib/idb';
import { fromUsd, micro, type MicroUsd } from '@/lib/money';

import type { RootAccount } from './passkey';

export interface TokenBalance {
  /** Human-readable amount, e.g. "1.5". */
  formatted: string;
  /** Micro-USD view of the balance (stablecoins are 1:1 with USD). */
  usd: MicroUsd;
  decimals: number;
  symbol: string;
}

const MOCK_BALANCE_KEY = 'sr:mock-balance';
const MOCK_START = fromUsd(12.5);

export const TOKEN_SYMBOL = isTestnet ? 'pathUSD' : 'USDC.e';

async function mockBalance(): Promise<MicroUsd> {
  return (await idb.get<number>(MOCK_BALANCE_KEY)) !== undefined ? micro((await idb.get<number>(MOCK_BALANCE_KEY)) ?? 0) : MOCK_START;
}

function fmt(usd: MicroUsd): string {
  return (usd / 1_000_000).toFixed(2);
}

async function tempoClient(account?: RootAccount) {
  const { createClient, http, tempoActions } = await import('viem/tempo');
  const { chain } = await import('./chain');
  return createClient({ chain, transport: http(env.rpcUrl), ...(account ? { account } : {}) }).extend(tempoActions());
}

/** Balance of the session token for `address`. */
export async function getTokenBalance(address: string, token: string): Promise<TokenBalance> {
  if (env.mock) {
    const usd = await mockBalance();
    return { formatted: fmt(usd), usd, decimals: 6, symbol: TOKEN_SYMBOL };
  }
  const client = await tempoClient();
  const bal = await client.token.getBalance({ account: address as `0x${string}`, token: token as `0x${string}` });
  const usd = micro(Math.round(Number(bal.formatted) * 1_000_000));
  return { formatted: bal.formatted, usd, decimals: bal.decimals, symbol: TOKEN_SYMBOL };
}

/** Testnet only: ask the Moderato faucet to fund the account. */
export async function requestFaucet(address: string): Promise<void> {
  if (!isTestnet) throw new Error('The faucet only exists on testnet');
  if (env.mock) {
    const usd = await mockBalance();
    await idb.set(MOCK_BALANCE_KEY, usd + 10_000_000);
    return;
  }
  const client = await tempoClient();
  await client.faucet.fundSync({ account: address as `0x${string}` });
}

/** Send `amountUsd` of the session token from the passkey account to `to` (one passkey prompt). */
export async function sendTokens(args: { account: RootAccount | null; token: string; to: string; amountUsd: MicroUsd }): Promise<string> {
  if (env.mock) {
    const usd = await mockBalance();
    if (args.amountUsd > usd) throw new Error('Insufficient balance');
    await idb.set(MOCK_BALANCE_KEY, usd - args.amountUsd);
    return `0x${'ab'.repeat(32)}`;
  }
  if (!args.account) throw new Error('Sign in with your passkey first');
  const client = await tempoClient(args.account);
  const hash = await client.token.transfer({ token: args.token as `0x${string}`, to: args.to as `0x${string}`, amount: { formatted: (args.amountUsd / 1_000_000).toFixed(6) } });
  return hash;
}

/** Mock ledger hook for the deposit stand-in: deposits leave the wallet. */
export async function mockDebit(amountUsd: MicroUsd): Promise<void> {
  if (!env.mock) return;
  const usd = await mockBalance();
  await idb.set(MOCK_BALANCE_KEY, Math.max(0, usd - amountUsd));
}
