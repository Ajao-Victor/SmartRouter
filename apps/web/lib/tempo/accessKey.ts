/**
 * Access key (PDF "One approval per deposit, never per message"): a local, non-extractable P-256
 * key that the root passkey authorizes once (TIP-1049 key authorization). The channel open
 * transaction is signed by this key inside a keychain envelope carrying that authorization, and
 * it becomes the channel's `authorizedSigner`, so every voucher is signed silently.
 */
import { Account, KeyAuthorizationManager, WebCryptoP256 } from 'viem/tempo';

import { idb } from '@/lib/idb';

import type { RootAccount } from './passkey';

const KEY_PAIR = 'sr:access-key';
const AUTH_PREFIX = 'sr:key-auth:';
/** ASSUMPTION: 30-day access-key expiry; the PDF leaves the lifetime open. */
export const ACCESS_KEY_DAYS = 30;

type KeyPair = Awaited<ReturnType<typeof WebCryptoP256.createKeyPair>>;
export type AccessKeyAccount = ReturnType<typeof Account.fromWebCryptoP256<{ access: RootAccount }>>;

async function getOrCreateKeyPair(): Promise<KeyPair> {
  const existing = await idb.get<KeyPair>(KEY_PAIR);
  if (existing) return existing;
  const pair = await WebCryptoP256.createKeyPair({ extractable: false });
  await idb.set(KEY_PAIR, pair);
  return pair;
}

type ManagerKey = Parameters<KeyAuthorizationManager.KeyAuthorizationManager['get']>[0];
type Signed = NonNullable<Awaited<ReturnType<KeyAuthorizationManager.KeyAuthorizationManager['get']>>>;

const authKey = (k: ManagerKey) => `${AUTH_PREFIX}${String(k.chainId)}:${k.address.toLowerCase()}:${k.accessKey.toLowerCase()}`;

/** Pending key authorizations persisted in IndexedDB so a reload keeps the one-time approval. */
export const keyAuthorizations = KeyAuthorizationManager.from({
  source: {
    get: (k) => idb.get<Signed>(authKey(k)),
    set: (k, v) => idb.set(authKey(k), v),
    remove: (k) => idb.del(authKey(k)),
  },
});

/** The access-key account acting for `root` (same address, own signer). */
export async function accessKeyAccount(root: RootAccount): Promise<AccessKeyAccount> {
  const pair = await getOrCreateKeyPair();
  return Account.fromWebCryptoP256(pair, { access: root, keyAuthorizationManager: keyAuthorizations });
}

/**
 * Make sure the root has authorized the access key for this chain (one passkey prompt, once per
 * device per 30 days). Returns true when a new authorization was signed.
 */
export async function ensureKeyAuthorization(root: RootAccount, accessKey: AccessKeyAccount, chainId: number): Promise<boolean> {
  const key: ManagerKey = { address: root.address, accessKey: accessKey.accessKeyAddress, chainId };
  const existing = await keyAuthorizations.get(key);
  if (existing && (existing.expiry === undefined || existing.expiry === null || existing.expiry > Math.floor(Date.now() / 1000) + 60)) return false;
  const signed = await root.signKeyAuthorization(
    { accessKeyAddress: accessKey.accessKeyAddress, keyType: accessKey.keyType },
    { chainId: BigInt(chainId), expiry: Math.floor(Date.now() / 1000) + ACCESS_KEY_DAYS * 24 * 60 * 60 },
  );
  await keyAuthorizations.set(key, signed);
  return true;
}

export async function forgetAccessKey(): Promise<void> {
  await idb.del(KEY_PAIR);
}
