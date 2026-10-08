/**
 * Adapter interface over the Tempo Accounts SDK + Tempo Wallet adapter (PDF).
 *
 * GAP (Backend_Gaps_Report §3/§8): the SDK package name, its dialog mechanics and the browser
 * session/voucher API are unconfirmed. Everything in the app talks to this interface; the real
 * implementation drops into `lib/tempo/impl.tempo.ts` without touching callers.
 */
import type { MicroUsd } from '@/lib/money';

export type SignerKind = 'passkey' | 'wallet';

export interface TempoAccount {
  address: string;
  kind: SignerKind;
}

export interface TokenBalanceRaw {
  token: string;
  micro: MicroUsd;
}

export interface SpendPermissionScope {
  token: string;
  payee: string;
  /** Session-contract calls the key may make. */
  calls: readonly ['open', 'topUp'];
  expiresAt: string;
}

export interface SpendPermission extends SpendPermissionScope {
  id: string;
  grantedAt: string;
}

export interface TempoAccountsAdapter {
  /** Initialise the SDK (idempotent). */
  init(): Promise<void>;
  /** Currently signed-in account, if any. */
  getAccount(): Promise<TempoAccount | null>;
  /** Opens Tempo's passkey sign-in dialog over our page; resolves with the account. */
  signIn(): Promise<TempoAccount>;
  signOut(): Promise<void>;
  /** Sign a message (SIWE) with the passkey or plain wallet. */
  signMessage(message: string): Promise<string>;
  /** Balances per Tempo token, read live (never stored by the app). */
  getBalances(): Promise<TokenBalanceRaw[]>;
  /** Tempo deposit flow (`wallet_deposit`): chain, token, amount; paths vary by region. */
  openDeposit(): Promise<void>;
  /** Tempo swap screen (`wallet_swap`) to USDC.e on the built-in DEX. */
  openSwap(): Promise<void>;
  /** Request the scoped spend permission (one passkey tap). */
  requestSpendPermission(scope: SpendPermissionScope): Promise<SpendPermission>;
  getSpendPermission(): Promise<SpendPermission | null>;
  revokeSpendPermission(): Promise<void>;
  /** Subscribe to SDK dialog open/close (we pause WebGL and never cover the dialog). */
  onDialog(cb: (open: boolean) => void): () => void;
}
