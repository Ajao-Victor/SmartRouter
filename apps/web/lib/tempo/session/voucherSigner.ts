/**
 * Browser voucher signer (PDF: a local signer registered as the channel's `authorizedSigner`,
 * TIP-1034; vouchers are cumulative and prompt-free).
 *
 * The private key is a NON-EXTRACTABLE WebCrypto ECDSA P-256 key stored in IndexedDB per
 * channel (security.md §3). It never enters React state or Zustand. Curve/encoding are
 * assumptions until Backend_Gaps_Report §3.2–3.3 are answered.
 */
import { idb } from '@/lib/idb';

const PREFIX = 'sr:signer:';
const memory = new Map<string, CryptoKeyPair>();

function subtle(): SubtleCrypto {
  return globalThis.crypto.subtle;
}

function toHex(buf: ArrayBuffer): string {
  return `0x${Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function load(channelId: string): Promise<CryptoKeyPair | null> {
  const inMem = memory.get(channelId);
  if (inMem) return inMem;
  const stored = await idb.get<CryptoKeyPair>(`${PREFIX}${channelId}`);
  if (stored) memory.set(channelId, stored);
  return stored ?? null;
}

export const voucherSigner = {
  /** Create (or load) the channel's keypair. The private key is non-extractable. */
  async getOrCreate(channelId: string): Promise<CryptoKeyPair> {
    const existing = await load(channelId);
    if (existing) return existing;
    const pair = await subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    memory.set(channelId, pair);
    await idb.set(`${PREFIX}${channelId}`, pair);
    return pair;
  },

  /** Public key as hex (raw SPKI) — this is what we register as `authorized_signer`. */
  async publicKeyHex(channelId: string): Promise<string> {
    const pair = await this.getOrCreate(channelId);
    return toHex(await subtle().exportKey('raw', pair.publicKey));
  },

  /** Sign bytes with the channel key. */
  async sign(channelId: string, bytes: Uint8Array): Promise<string> {
    const pair = await this.getOrCreate(channelId);
    const sig = await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, bytes as BufferSource);
    return toHex(sig);
  },

  /** Verify a signature (used by tests and the mock session client). */
  async verify(channelId: string, bytes: Uint8Array, signatureHex: string): Promise<boolean> {
    const pair = await load(channelId);
    if (!pair) return false;
    const sig = Uint8Array.from(signatureHex.replace(/^0x/, '').match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? []);
    return subtle().verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, sig, bytes as BufferSource);
  },

  /** Store an existing pair under a (new) channel id. */
  async adopt(channelId: string, pair: CryptoKeyPair): Promise<void> {
    memory.set(channelId, pair);
    await idb.set(`${PREFIX}${channelId}`, pair);
  },

  /** "Forget this device": drop the key. */
  async forget(channelId: string): Promise<void> {
    memory.delete(channelId);
    await idb.del(`${PREFIX}${channelId}`);
  },

  /** Is the key extractable? Always false by construction; exposed for tests. */
  async isExtractable(channelId: string): Promise<boolean> {
    const pair = await load(channelId);
    return pair?.privateKey.extractable ?? false;
  },
};

/** Canonical voucher bytes: `${channelId}:${cumulativeMicro}` (assumption — Gaps §3.2). */
export function voucherBytes(channelId: string, cumulativeMicro: number): Uint8Array {
  return new TextEncoder().encode(`${channelId}:${String(cumulativeMicro)}`);
}
