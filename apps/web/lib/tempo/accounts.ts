/**
 * Entry point for wallet UX. All sign-in, deposit, swap and approval flows go through the
 * adapter returned here (security.md §2: one SDK, never raw `window.ethereum`).
 *
 * Real SDK: implement `TempoAccountsAdapter` in `impl.tempo.ts` once the package is confirmed
 * (Backend_Gaps_Report §3) and return it below for mainnet. Until then the mock adapter runs
 * on testnet/mock so every flow is demoable and the SDK dialog pause is exercised.
 */
import { useUiStore } from '@/stores/uiStore';

import { isMockTempo, MockTempoAccounts } from './mock';
import type { TempoAccountsAdapter } from './types';

let instance: TempoAccountsAdapter | null = null;
let wired = false;

export function getTempoAccounts(): TempoAccountsAdapter {
  if (instance) return instance;
  if (!isMockTempo()) {
     
    console.warn('[tempo] Real Tempo Accounts SDK adapter not wired yet (Backend_Gaps_Report §3); using mock.');
  }
  instance = new MockTempoAccounts();
  if (!wired && typeof window !== 'undefined') {
    wired = true;
    instance.onDialog((open) => {
      useUiStore.getState().setSdkDialogOpen(open);
    });
  }
  return instance;
}

/** Test hook. */
export function setTempoAccountsForTests(adapter: TempoAccountsAdapter | null): void {
  instance = adapter;
  wired = false;
}
