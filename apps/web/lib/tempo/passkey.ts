/**
 * Tempo passkey accounts (PDF "Wallet and sign-in": Tempo passkey accounts work, as well as
 * plain EOAs). A WebAuthn P-256 credential is created once per device; its public key must be
 * stored because it cannot be read back from the authenticator. The root account signs the SIWE
 * message and the one key authorization; every later signature comes from the access key.
 */
import { Account, WebAuthnP256 } from 'viem/tempo';

import { idb } from '@/lib/idb';

const KEY = 'sr:passkey';

export interface StoredPasskey {
  id: string;
  publicKey: `0x${string}`;
  address: string;
  createdAt: string;
}

export type RootAccount = ReturnType<typeof Account.fromWebAuthnP256>;

export async function getStoredPasskey(): Promise<StoredPasskey | null> {
  return (await idb.get<StoredPasskey>(KEY)) ?? null;
}

export async function forgetPasskey(): Promise<void> {
  await idb.del(KEY);
}

function rpId(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.hostname;
}

/** Build the root account from a stored credential (no prompt until it signs). */
export function rootAccountFrom(stored: Pick<StoredPasskey, 'id' | 'publicKey'>): RootAccount {
  const id = rpId();
  return Account.fromWebAuthnP256({ id: stored.id, publicKey: stored.publicKey }, id ? { rpId: id } : {});
}

/** Create a new passkey (one platform dialog) and persist its public key. */
export async function createPasskey(label = 'SmartRouter'): Promise<{ account: RootAccount; stored: StoredPasskey }> {
  const id = rpId();
  const credential = await WebAuthnP256.createCredential({ label, ...(id ? { rpId: id } : {}) });
  const account = rootAccountFrom({ id: credential.id, publicKey: credential.publicKey });
  const stored: StoredPasskey = { id: credential.id, publicKey: credential.publicKey, address: account.address, createdAt: new Date().toISOString() };
  await idb.set(KEY, stored);
  return { account, stored };
}

/**
 * Use an existing passkey. With a stored credential the account is rebuilt silently; without
 * one the platform picker runs (`getCredential`) and the public key is read from the store.
 */
export async function usePasskey(): Promise<{ account: RootAccount; stored: StoredPasskey } | null> {
  const stored = await getStoredPasskey();
  if (!stored) return null;
  return { account: rootAccountFrom(stored), stored };
}
