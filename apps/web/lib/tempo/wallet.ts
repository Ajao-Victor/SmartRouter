/**
 * Wallet facade used by the hooks: connect/restore a Tempo passkey account, derive the
 * access-key account for payments, and sign out. On `NEXT_PUBLIC_MOCK=1` a deterministic mock
 * account stands in so the whole UI runs offline against MSW.
 *
 * viem/tempo and mppx are imported lazily so the chat route's first load stays small; they
 * arrive on sign-in and on the first paid run.
 */
import { env } from '@/lib/env';
import { idb } from '@/lib/idb';
import type { MicroUsd } from '@/lib/money';

import type { AccessKeyAccount } from './accessKey';
import type { RootAccount } from './passkey';
import type { MessageSigner } from './siwe';

export interface ConnectedWallet {
  address: string;
  kind: 'passkey' | 'mock';
  signer: MessageSigner;
  /** The passkey root account (null on mocks) — signs on-chain transfers. */
  root: RootAccount | null;
  /** Prepares payments: authorizes the access key once (passkey prompt) and configures the manager. */
  preparePayments: (maxDepositUsd: MicroUsd) => Promise<void>;
}

const MOCK_ADDRESS = '0x7a3f9c1e5b2d4a6f8e0c1b3d5f7a9c2e4b6d8f01';
const PASSKEY_KEY = 'sr:passkey';

const passkeys = () => import('./passkey');
const accessKeys = () => import('./accessKey');
const sessions = () => import('./session');

function mockWallet(): ConnectedWallet {
  return {
    address: MOCK_ADDRESS,
    kind: 'mock',
    root: null,
    signer: {
      address: MOCK_ADDRESS,
      signMessage: () =>
        new Promise((r) => {
          setTimeout(() => {
            r(`0xmock${'00'.repeat(64)}`);
          }, 400);
        }),
    },
    preparePayments: () => Promise.resolve(),
  };
}

function fromRoot(root: RootAccount): ConnectedWallet {
  let access: AccessKeyAccount | null = null;
  return {
    address: root.address,
    kind: 'passkey',
    root,
    signer: { address: root.address, signMessage: (args) => root.signMessage(args) },
    preparePayments: async (maxDepositUsd) => {
      const [{ accessKeyAccount, ensureKeyAuthorization }, { configureSession }] = await Promise.all([accessKeys(), sessions()]);
      access ??= await accessKeyAccount(root);
      await ensureKeyAuthorization(root, access, env.chainId);
      configureSession({ account: access, maxDepositUsd });
    },
  };
}

/** Restore the wallet silently from the stored passkey (no prompt). */
export async function restoreWallet(): Promise<ConnectedWallet | null> {
  if (env.mock) return (await idb.get(PASSKEY_KEY)) ? mockWallet() : null;
  const { loadPasskey } = await passkeys();
  const found = await loadPasskey();
  return found ? fromRoot(found.account) : null;
}

/** Connect: reuse the device passkey or create one (one platform dialog). */
export async function connectWallet(): Promise<ConnectedWallet> {
  if (env.mock) {
    await new Promise((r) => {
      setTimeout(r, 500);
    });
    await idb.set(PASSKEY_KEY, { id: 'mock', publicKey: '0x', address: MOCK_ADDRESS, createdAt: new Date().toISOString() });
    return mockWallet();
  }
  const { loadPasskey, createPasskey } = await passkeys();
  const existing = await loadPasskey();
  if (existing) return fromRoot(existing.account);
  const created = await createPasskey('SmartRouter');
  return fromRoot(created.account);
}

let current: ConnectedWallet | null = null;

/** The connected wallet for this tab (non-serialisable, so it lives here, not in a store). */
export function getCurrentWallet(): ConnectedWallet | null {
  return current;
}

export function setCurrentWallet(wallet: ConnectedWallet | null): void {
  current = wallet;
}

/** Forget this device's passkey reference and access key; the on-chain account is untouched. */
export async function disconnectWallet(): Promise<void> {
  current = null;
  if (env.mock) {
    await idb.del(PASSKEY_KEY);
    return;
  }
  const [{ forgetPasskey }, { forgetAccessKey }, { resetSession }] = await Promise.all([passkeys(), accessKeys(), sessions()]);
  resetSession();
  await forgetPasskey();
  await forgetAccessKey();
}
