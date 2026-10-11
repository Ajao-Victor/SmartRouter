'use client';

import { useState } from 'react';

import { clsx } from 'clsx';
import { Copy, ExternalLink, RefreshCw } from 'lucide-react';

import type { SettingsPatch, User } from '@/lib/api/types';
import { env, isTestnet } from '@/lib/env';
import { addressUrl, shortHex } from '@/lib/explorer';
import { formatUsd, fromUsd } from '@/lib/money';
import { TOKEN_SYMBOL } from '@/lib/tempo/walletActions';

import { useFaucet, useSendTokens, useWalletBalance } from '@/hooks/useWalletBalance';
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
 * the signed-in account (email + Privy Tempo wallet) with its on-chain balance, testnet faucet and
 * a Send form, and the allocation settings.
 */
export function WalletSheet({
  user,
  onTopUp,
  onCloseSession,
  onSignOut,
  onSettings,
  busy = {},
}: WalletSheetProps) {
  const open = useUiStore((s) => s.walletSheetOpen);
  const toggleWallet = useUiStore((s) => s.toggleWallet);
  const openDialog = useUiStore((s) => s.openDialog);
  const alloc = useAllocationStore();
  const hasSession = alloc.status !== 'none' && alloc.status !== 'closed';
  const explorer = addressUrl(user.address);
  const amount = formatUsd(selectNextDeposit(alloc), { min: 0 });
  const balance = useWalletBalance(user.address, open);
  const faucet = useFaucet(user.address);
  const send = useSendTokens();
  const [sendOpen, setSendOpen] = useState(false);
  const [to, setTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const field =
    'h-10 w-full rounded-lg bg-bg-2 px-3 text-sm text-text-0 shadow-hairline outline-none placeholder:text-text-2 focus:shadow-glow-accent';
  const secondary =
    'inline-flex h-10 items-center justify-center rounded-lg bg-bg-2 px-4 text-sm font-medium text-text-0 transition-colors hocus:bg-bg-3 disabled:opacity-60';

  const submitSend = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const usd = Number(sendAmount);
    if (!Number.isFinite(usd) || usd <= 0) {
      toast.warn('Enter an amount');
      return;
    }
    send.mutate(
      { to: to.trim(), amountUsd: fromUsd(usd) },
      {
        onSuccess: () => {
          setSendOpen(false);
          setTo('');
          setSendAmount('');
        },
      },
    );
  };

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
              {user.loginMethod && (
                <span className="text-text-2">
                  {' '}
                  ·{' '}
                  {user.loginMethod === 'google'
                    ? 'Google'
                    : user.loginMethod === 'email'
                      ? 'Email'
                      : user.loginMethod}
                </span>
              )}
            </p>
          )}
          <p className="num flex items-center gap-2 text-sm text-text-0">
            {shortHex(user.address, 8, 6)}
            <button
              type="button"
              aria-label="Copy address"
              onClick={() => void copy()}
              className="rounded-md p-1 text-text-2 transition-colors hocus:bg-bg-2 hocus:text-text-0"
            >
              <Copy size={14} />
            </button>
            {explorer && (
              <a
                href={explorer}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on explorer"
                className="rounded-md p-1 text-text-2 transition-colors hocus:bg-bg-2 hocus:text-text-0"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </p>
          <p className="text-xs text-text-2">
            Tempo {isTestnet ? 'Moderato testnet · pathUSD' : 'mainnet · USDC.e'} · chain{' '}
            {String(env.chainId)}. Fund this address from any Tempo wallet; runs are paid from the
            deposit below.
          </p>
        </section>

        <section className="rounded-xl bg-bg-1 p-4 shadow-hairline" aria-label="Your wallet">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">
                Wallet balance · {TOKEN_SYMBOL}
              </p>
              <p className="num mt-1 text-2xl font-semibold text-text-0" aria-live="polite">
                {balance.data ? `$${balance.data.formatted}` : balance.isError ? '—' : '…'}
              </p>
              {balance.isError && (
                <p className="text-xs text-signal">Could not read the balance from the RPC.</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Refresh balance"
              onClick={() => {
                void balance.refetch();
              }}
              className="rounded-md p-2 text-text-2 transition-colors hocus:bg-bg-2 hocus:text-text-0"
            >
              <RefreshCw
                size={16}
                className={clsx(balance.isFetching && 'motion-ok:animate-spin')}
              />
            </button>
          </div>
          <p className="mt-1 text-xs text-text-2">
            This is what your embedded wallet holds on-chain; deposits come out of it
            {isTestnet ? ', and the faucet tops it up for free on testnet.' : '.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isTestnet && (
              <button
                type="button"
                className={secondary}
                onClick={() => {
                  faucet.mutate();
                }}
                disabled={faucet.isPending}
              >
                {faucet.isPending ? 'Requesting…' : 'Get test funds'}
              </button>
            )}
            <button
              type="button"
              className={secondary}
              aria-expanded={sendOpen}
              onClick={() => {
                setSendOpen((o) => !o);
              }}
            >
              Send
            </button>
          </div>
          {sendOpen && (
            <form className="mt-3 space-y-2" onSubmit={submitSend} aria-label="Send tokens">
              <input
                className={field}
                placeholder="Recipient address 0x…"
                aria-label="Recipient address"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                }}
                autoComplete="off"
                spellCheck={false}
              />
              <div className="flex gap-2">
                <input
                  className={field}
                  placeholder={`Amount in ${TOKEN_SYMBOL}`}
                  aria-label="Amount"
                  inputMode="decimal"
                  value={sendAmount}
                  onChange={(e) => {
                    setSendAmount(e.target.value);
                  }}
                />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi disabled:opacity-60"
                  disabled={send.isPending}
                >
                  {send.isPending ? 'Sending…' : 'Send'}
                </button>
              </div>
              <p className="text-xs text-text-2">
                Signed by your embedded wallet. Network fees are paid in {TOKEN_SYMBOL}.
              </p>
            </form>
          )}
        </section>

        <section className="rounded-xl bg-bg-1 p-4 shadow-hairline" aria-label="Payment session">
          <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Payment session</p>
          {hasSession ? (
            <dl className="mt-2 divide-y divide-line">
              <Row label="Deposit" value={formatUsd(alloc.depositUsd)} />
              <Row label="Spent" value={formatUsd(alloc.spentUsd)} />
              <Row
                label="Remaining"
                value={formatUsd(alloc.remainingUsd)}
                tone={alloc.status === 'used' ? 'text-signal' : 'text-accent-2'}
              />
              <Row label="Requests" value={String(alloc.requests)} />
            </dl>
          ) : (
            <p className="mt-2 text-sm text-text-1">
              No deposit yet. Your first paid run deposits {amount} with one wallet approval; after
              that every answer is paid silently from it.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTopUp}
              disabled={alloc.status === 'toppingUp' || alloc.status === 'closing'}
              className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi disabled:opacity-60"
            >
              {alloc.status === 'toppingUp'
                ? 'Setting up…'
                : hasSession
                  ? 'New deposit'
                  : `Deposit ${amount}`}
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
          <p className="mt-2 text-xs text-text-2">
            No automatic top-ups. A new deposit closes this one first. Closing returns the unspent
            deposit to your wallet; idle deposits settle after 10 minutes and close after 24 h.
          </p>
        </section>

        <section className="space-y-2" aria-label="Allocation settings">
          <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Allocation</p>
          <AllocationControls
            allocationUsd={user.allocationUsd}
            weeklyLimitUsd={user.weeklyLimitUsd}
            autoFreeFallback={user.autoFreeFallback}
            disabled={busy.settings ?? false}
            onChange={onSettings}
          />
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
                <p className="text-sm text-text-0">
                  {interest === 'naira' ? 'Naira via Paystack' : 'MPP Credits'}
                </p>
                <p className="mt-0.5 text-xs text-text-2">Join the waitlist →</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2" aria-label="Session">
          <button
            type="button"
            onClick={onSignOut}
            disabled={busy.signOut}
            className="rounded-lg border border-signal/40 px-3 py-1.5 text-sm text-signal transition-colors hocus:bg-signal/10 disabled:opacity-60"
          >
            {busy.signOut ? 'Signing out…' : 'Sign out'}
          </button>
          <p className="text-xs text-text-2">
            Signing out leaves the deposit open; the backend settles it after 10 idle minutes and
            closes it after 24 hours, so no money is stuck. Sign in with the same email on any
            device to get your chats back.
          </p>
        </section>
      </div>
    </Sheet>
  );
}
