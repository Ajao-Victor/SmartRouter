/**
 * Sign-In with Ethereum (PDF: backend verifies passkey and plain-wallet signatures, sets an
 * httpOnly session cookie). Message fields follow EIP-4361; exact statement/chain id are to be
 * confirmed with the API (Backend_Gaps_Report §6.1).
 */
import { api } from '@/lib/api/endpoints';
import type { User } from '@/lib/api/types';
import { env } from '@/lib/env';

import type { TempoAccount, TempoAccountsAdapter } from './types';

export interface SiweFields {
  domain: string;
  address: string;
  uri: string;
  nonce: string;
  chainId: number;
  issuedAt: string;
  statement?: string;
}

/** Tempo chain ids — placeholders until confirmed (Gaps §5.4). */
export const CHAIN_IDS = { testnet: 4217, mainnet: 4216 } as const;

export function buildSiweMessage(f: SiweFields): string {
  const lines = [
    `${f.domain} wants you to sign in with your Ethereum account:`,
    f.address,
    '',
    ...(f.statement ? [f.statement, ''] : []),
    `URI: ${f.uri}`,
    'Version: 1',
    `Chain ID: ${String(f.chainId)}`,
    `Nonce: ${f.nonce}`,
    `Issued At: ${f.issuedAt}`,
  ];
  return lines.join('\n');
}

/** nonce → message → sign with the SDK → verify with the API (sets the cookie) → user. */
export async function signInWithEthereum(adapter: TempoAccountsAdapter, account: TempoAccount): Promise<User> {
  const { nonce } = await api.auth.nonce();
  const message = buildSiweMessage({
    domain: typeof window === 'undefined' ? 'smartrouter' : window.location.host,
    address: account.address,
    uri: typeof window === 'undefined' ? 'https://smartrouter' : window.location.origin,
    nonce,
    chainId: CHAIN_IDS[env.network],
    issuedAt: new Date().toISOString(),
    statement: 'Sign in to SmartRouter. This does not move any funds.',
  });
  const signature = await adapter.signMessage(message);
  const { user } = await api.auth.verify({ message, signature, kind: account.kind });
  return user;
}
