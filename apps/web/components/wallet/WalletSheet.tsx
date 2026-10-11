'use client';

import { Copy, ExternalLink } from 'lucide-react';

import type { SettingsPatch, User } from '@/lib/api/types';
import { env, isTestnet } from '@/lib/env';
import { addressUrl, shortHex } from '@/lib/explorer';
import { formatUsd } from '@/lib/money';

import { selectNextDeposit, useAllocationStore } from '@/stores/allocationStore';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

import { Sheet } from '@/components/ui/Sheet';
import { AllocationControls } from '@/components/wallet/AllocationControls';

export interface WalletSheetProps {
  user: User;
  onTopUp: () => void;
  onCloseSession: () => void;
  onSignOut: () => void;
  onSettings: (patch: SettingsPatch) => void;
  busy?: { close?: boolean; settings?: boolean; signOut?: boolean };
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-text-2">{label}</dt>
      <dd className={`num text-sm ${tone ?? 'text-text-0'}`}>{value}</dd>
    </div>
  );
}

/**
 * Wallet sheet (Handover "Paying for runs"): the open deposit from `/sessions/current` — deposit,
 * spent, remaining, requests — with New deposit (close-and-reopen; no top-up in v1) and Close
 * (the rest returns now; the backend also settles after 10 idle minutes and closes after 24 h),
 * the allocation settings, and the signed-in account (email + Privy Tempo wallet).
 */
export function WalletSheet({ user, onTopUp, onCloseSession, onSignOut, onSettings, busy = {} }: WalletSheetProps) {
  const open = useUiStore((s) => s.walletSheetOpen);
  const toggleWallet = useUiStore((s) => s.toggleWallet);
  const openDialog = useUiStore((s) => s.openDialog);
  const alloc = useAllocationStore();
  const hasSession = alloc.status !== 'none' && alloc.status !== 'closed';
  const explorer = addressUrl(user.address);
  const amount = formatUsd(selectNextDeposit(alloc), { min: 0 });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.address);
      toast.success('Address copied');
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        toggleWallet(false);
      }}
      title="Wallet"
    >
      <div className="space-y-6 pb-4">
        <section className="space-y-1" aria-label="Account">
          {user.email && (
            <p className="text-sm text-text-0">
              {user.email}
              {user.loginMethod && <span className="text-text-2"> · {user.loginMethod === 'google' ? 'Google' : user.loginMethod === 'email' ? 'Email' : user.loginMethod}</span>}
            </p>
          )}
          <p className="num flex items-center gap-2 text-sm text-text-0">
            {shortHex(user.address, 8, 6)}
            <button type="button" aria-label="Copy address" onClick={() => void copy()} className="rounded-md p-1 text-text-2 transition-colors hocus:bg-bg-2 hocus:text-text-0">
              <Copy size={14} />
            </button>
            {explorer && (
              <a href={explorer} target="_blank" rel="noopener noreferrer" aria-label="View on explorer" className="rounded-md p-1 text-text-2 transition-colors hocus:bg-bg-2 hocus:text-text-0">
                <ExternalLink size={14} />
              </a>
            )}
          </p>
          <p className="text-xs text-text-2">
            Tempo {isTestnet ? 'Moderato testnet · pathUSD' : 'mainnet · USDC.e'} · chain {String(env.chainId)}. Fund this address from any Tempo wallet; runs are paid from the deposit below.
          </p>
        </section>

        <section className="rounded-xl bg-bg-1 p-4 shadow-hairline" aria-label="Payment session">
          <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Payment session</p>
          {hasSession ? (
            <dl className="mt-2 divide-y divide-line">
              <Row label="Deposit" value={formatUsd(alloc.depositUsd)} />
              <Row label="Spent" value={formatUsd(alloc.spentUsd)} />
              <Row label="Remaining" value={formatUsd(alloc.remainingUsd)} tone={alloc.status === 'used' ? 'text-signal' : 'text-accent-2'} />
              <Row label="Requests" value={String(alloc.requests)} />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-text-1">
              No deposit yet. Your first paid run deposits {amount} with one wallet approval; after that every answer is paid silently from it.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTopUp}
              disabled={alloc.status === 'toppingUp' || alloc.status === 'closing'}
              className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi disabled:opacity-60"
            >
              {alloc.status === 'toppingUp' ? 'Setting up…' : hasSession ? 'New deposit' : `Deposit ${amount}`}
            </button>
            {hasSession && (
              <button
                type="button"
                onClick={onCloseSession}
                disabled={busy.close || alloc.status === 'closing'}
                className="inline-flex h-10 items-center rounded-lg bg-bg-2 px-4 text-sm font-medium text-text-0 transition-colors hocus:bg-bg-3 disabled:opacity-60"
              >
                {busy.close ? 'Closing…' : 'Close and withdraw'}
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-text-2">No automatic top-ups. A new deposit closes this one first. Closing returns the unspent deposit to your wallet; idle deposits settle after 10 minutes and close after 24 h.</p>
        </section>

        <section className="space-y-2" aria-label="Allocation settings">
          <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Allocation</p>
          <AllocationControls allocationUsd={user.allocationUsd} weeklyLimitUsd={user.weeklyLimitUsd} autoFreeFallback={user.autoFreeFallback} disabled={busy.settings ?? false} onChange={onSettings} />
        </section>

        <section className="space-y-2" aria-label="Coming soon">
          <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Coming soon</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['naira', 'credits'] as const).map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => {
                  openDialog('waitlist');
                }}
                className="rounded-lg border border-dashed border-line-strong p-3 text-left transition-colors hocus:bg-bg-1"
              >
                <p className="text-sm text-text-0">{interest === 'naira' ? 'Naira via Paystack' : 'MPP Credits'}</p>
                <p className="mt-0.5 text-xs text-text-2">Join the waitlist →</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2" aria-label="Session">
          <button type="button" onClick={onSignOut} disabled={busy.signOut} className="rounded-lg border border-signal/40 px-3 py-1.5 text-sm text-signal transition-colors hocus:bg-signal/10 disabled:opacity-60">
            {busy.signOut ? 'Signing out…' : 'Sign out'}
          </button>
          <p className="text-xs text-text-2">Signing out leaves the deposit open; the backend settles it after 10 idle minutes and closes it after 24 hours, so no money is stuck. Sign in with the same email on any device to get your chats back.</p>
        </section>
      </div>
    </Sheet>
  );
}
