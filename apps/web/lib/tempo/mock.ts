/**
 * Mock Tempo Accounts adapter for dev/testnet previews and tests.
 * Simulates the SDK's dialogs (sign-in, deposit, swap, approval) with a short delay while
 * flagging `dialog open` so the app behaves exactly as it will with the real SDK.
 */
import { env } from '@/lib/env';
import { idb } from '@/lib/idb';
import { micro } from '@/lib/money';

import type { SpendPermission, SpendPermissionScope, TempoAccount, TempoAccountsAdapter, TokenBalanceRaw } from './types';

const KEY_ACCOUNT = 'sr:mock-account';
const KEY_PERMISSION = 'sr:mock-permission';
const DEMO_ADDRESS = '0x7a3f9c1e5b2d4a6f8e0c1b3d5f7a9c2e4b6d8f01';

export class MockTempoAccounts implements TempoAccountsAdapter {
  private account: TempoAccount | null = null;
  private permission: SpendPermission | null = null;
  private balances: TokenBalanceRaw[] = [
    { token: 'USDC.e', micro: micro(12_500_000) },
    { token: 'OUSD', micro: micro(4_000_000) },
  ];
  private listeners = new Set<(open: boolean) => void>();
  private initialised = false;

  constructor(private readonly dialogMs = 900) {}

  private emit(open: boolean) {
    for (const l of this.listeners) l(open);
  }

  /** Simulate an SDK dialog: open → wait → close. */
  private async dialog<T>(work: () => T | Promise<T>): Promise<T> {
    this.emit(true);
    try {
      await new Promise((r) => setTimeout(r, this.dialogMs));
      return await work();
    } finally {
      this.emit(false);
    }
  }

  async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;
    const saved = await idb.get<TempoAccount>(KEY_ACCOUNT);
    if (saved) this.account = saved;
    const perm = await idb.get<SpendPermission>(KEY_PERMISSION);
    if (perm) this.permission = perm;
  }

  async getAccount(): Promise<TempoAccount | null> {
    await this.init();
    return this.account;
  }

  signIn(): Promise<TempoAccount> {
    return this.dialog(async () => {
      this.account = { address: DEMO_ADDRESS, kind: 'passkey' };
      await idb.set(KEY_ACCOUNT, this.account);
      return this.account;
    });
  }

  async signOut(): Promise<void> {
    this.account = null;
    await idb.del(KEY_ACCOUNT);
  }

  signMessage(message: string): Promise<string> {
    if (!this.account) return Promise.reject(new Error('Not signed in'));
    // Deterministic pseudo-signature so the mock API can "verify" it.
    let h = 0;
    for (let i = 0; i < message.length; i += 1) h = (h * 31 + message.charCodeAt(i)) | 0;
    return Promise.resolve(`0xmock${Math.abs(h).toString(16).padStart(60, '0')}`);
  }

  getBalances(): Promise<TokenBalanceRaw[]> {
    return Promise.resolve(this.balances.map((b) => ({ ...b })));
  }

  openDeposit(): Promise<void> {
    return this.dialog(() => {
      this.balances = this.balances.map((b) => (b.token === 'USDC.e' ? { ...b, micro: micro(b.micro + 2_000_000) } : b));
    });
  }

  openSwap(): Promise<void> {
    return this.dialog(() => {
      const other = this.balances.filter((b) => b.token !== 'USDC.e').reduce((n, b) => n + b.micro, 0);
      this.balances = [{ token: 'USDC.e', micro: micro((this.balances.find((b) => b.token === 'USDC.e')?.micro ?? 0) + other) }];
    });
  }

  requestSpendPermission(scope: SpendPermissionScope): Promise<SpendPermission> {
    return this.dialog(async () => {
      this.permission = { ...scope, id: `perm_${String(Date.now())}`, grantedAt: new Date().toISOString() };
      await idb.set(KEY_PERMISSION, this.permission);
      return this.permission;
    });
  }

  async getSpendPermission(): Promise<SpendPermission | null> {
    await this.init();
    if (this.permission && Date.parse(this.permission.expiresAt) < Date.now()) return null;
    return this.permission;
  }

  async revokeSpendPermission(): Promise<void> {
    this.permission = null;
    await idb.del(KEY_PERMISSION);
  }

  onDialog(cb: (open: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}

export function isMockTempo(): boolean {
  return env.mock || env.network === 'testnet';
}
