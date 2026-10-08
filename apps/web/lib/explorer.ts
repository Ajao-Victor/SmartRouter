import { env } from '@/lib/env';

/**
 * Tempo explorer links (Backend_Gaps_Report §10.3: base URLs unconfirmed — placeholders).
 * Every hash/address is regex-validated before it is rendered or linked (security.md §4).
 */
const BASES: Record<typeof env.network, string> = {
  testnet: 'https://explore.testnet.tempo.xyz',
  mainnet: 'https://explore.tempo.xyz',
};

export const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
export const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isTxHash(v: string): boolean {
  return TX_HASH_RE.test(v);
}
export function isAddress(v: string): boolean {
  return ADDRESS_RE.test(v);
}

export function txUrl(hash: string): string | null {
  return isTxHash(hash) ? `${BASES[env.network]}/tx/${hash}` : null;
}
export function addressUrl(address: string): string | null {
  return isAddress(address) ? `${BASES[env.network]}/address/${address}` : null;
}

export function shortHex(v: string, head = 6, tail = 4): string {
  return v.length > head + tail + 2 ? `${v.slice(0, head)}…${v.slice(-tail)}` : v;
}
