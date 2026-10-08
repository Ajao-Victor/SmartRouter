/**
 * PDF spend permission: an access key limited to USDC.e, scoped to the session contract's open
 * and top-up calls with SmartRouter as payee, with an expiry. One passkey tap on first run.
 * Expiry default 30 days is an assumption (Backend_Gaps_Report §3.4).
 */
import { env } from '@/lib/env';
import { getTempoAccounts } from '@/lib/tempo/accounts';
import type { SpendPermission, SpendPermissionScope } from '@/lib/tempo/types';

export const SPEND_PERMISSION_DAYS = 30;

export function spendPermissionScope(): SpendPermissionScope {
  return {
    token: env.usdceAddress,
    payee: env.smartrouterPayee,
    calls: ['open', 'topUp'],
    expiresAt: new Date(Date.now() + SPEND_PERMISSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function getSpendPermission(): Promise<SpendPermission | null> {
  const tempo = getTempoAccounts();
  await tempo.init();
  return tempo.getSpendPermission();
}

/** Returns the existing permission or requests one (single passkey tap). */
export async function ensureSpendPermission(): Promise<SpendPermission> {
  const existing = await getSpendPermission();
  if (existing) return existing;
  return getTempoAccounts().requestSpendPermission(spendPermissionScope());
}

export async function revokeSpendPermission(): Promise<void> {
  await getTempoAccounts().revokeSpendPermission();
}
