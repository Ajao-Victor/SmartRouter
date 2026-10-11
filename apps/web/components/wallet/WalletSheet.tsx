'use client';

import { useState } from 'react';

import { clsx } from 'clsx';
import { Copy, ExternalLink, RefreshCw } from 'lucide-react';

import type { SettingsPatch, User } from '@/lib/api/types';
import { env, isTestnet } from '@/lib/env';
import { addressUrl, shortHex } from '@/lib/explorer';
import { formatUsd, fromUsd, type MicroUsd } from '@/lib/money';
import { TOKEN_SYMBOL } from '@/lib/tempo/walletActions';

import { useFaucet, useSendTokens, useWalletBalance } from '@/hooks/useWalletBalance';
import { useAllocationStore } from '@/stores/allocationStore';
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
  busy?: { topUp?: boolean; close?: boolean; settings?: boolean; signOut?: boolean };
}

const primary = 'inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi disabled:opacity-60';
const secondary = 'inline-flex h-10 items-center justify-center rounded-lg bg-bg-2 px-4 text-sm font-medium text-text-0 transition-colors hocus:bg-bg-3 disabled:opacity-60';
const field = 'h-10 w-full rounded-lg bg-bg-2 px-3 text-sm text-text-0 shadow-hairline outline-none placeholder:text-text-2 focus:shadow-glow-accent';

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-text-2">{label}</dt>
      <dd className={clsx('num text-sm', tone ?? 'text-text-0')}>{value}</dd>
    </div>
  );
}

/**
 * Wallet sheet. Two layers of money, as the PDF draws them:
 *  1. the user's wallet — the passkey account's token balance on Tempo (read from the RPC),
 *     fund it (testnet faucet / any Tempo wallet), send tokens out;
 *  2. the payment session — deposit, spent, remaining, requests from `/sessions/current`,
 *     with Deposit / Top up and Withdraw (= `manager.close()`, unspent deposit returns now).
 */
export function WalletSheet({ user, onTopUp, onCloseSession, onSignOut, onSettings, busy = {} }: WalletSheetProps) {
  const open = useUiStore((s) => s.walletSheetOpen);
  const toggleWallet = useUiStore((s) => s.toggleWallet);
  const openDialog = useUiStore((s) => s.openDialog);
  const alloc = useAllocationStore();
  const balance = useWalletBalance(user.address, open);
  const faucet = useFaucet(user.address);
  const send = useSendTokens();
  const [sendOpen, setSendOpen] = useState(false);
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  const hasSession = alloc.status !== 'none' && alloc.status !== 'closed';
  const explorer = addressUrl(user.address);
  const deposit = formatUsd(alloc.suggestedDepositUsd, { min: 0 });
  const walletUsd: MicroUsd | null = balance.data?.usd ?? null;
  const canDeposit = walletUsd === null || walletUsd >= alloc.suggestedDepositUsd;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.address);
      toast.success('Address copied');
    } catch {
      /* clipboard unavailable */
    }
  };

  const submitSend = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const usd = Number(amount);
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
          setAmount('');
        },
      },
    );
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
        {/* ----------------------------- the user's wallet ----------------------------- */}
        <section className="rounded-xl bg-bg-1 p-4 shadow-hairline" aria-label="Your wallet">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Your wallet · {TOKEN_SYMBOL}</p>
              <p className="num mt-1 text-2xl font-semibold text-text-0" aria-live="polite">
                {balance.data ? `$${balance.data.formatted}` : balance.isError ? '—' : '…'}
              </p>
              {balance.isError && <p className="text-xs text-signal">Could not read the balance from the RPC.</p>}
            </div>
            <button
              type="button"
              aria-label="Refresh balance"
              onClick={() => {
                void balance.refetch();
              }}
              className="rounded-md p-2 text-text-2 transition-colors hocus:bg-bg-2 hocus:text-text-0"
            >
              <RefreshCw size={16} className={clsx(balance.isFetching && 'motion-ok:animate-spin')} />
            </button>
          </div>
          <p className="num mt-2 flex items-center gap-2 text-sm text-text-1">
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
          <p className="mt-1 text-xs text-text-2">
            Tempo {isTestnet ? 'Moderato testnet' : 'mainnet'} · chain {String(env.chainId)}. Receive {TOKEN_SYMBOL} at this address from any Tempo wallet
            {isTestnet ? ', or take free test funds from the faucet.' : '.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isTestnet && (
              <button type="button" className={secondary} onClick={() => { faucet.mutate(); }} disabled={faucet.isPending}>
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
              <input className={field} placeholder="Recipient address 0x…" aria-label="Recipient address" value={to} onChange={(e) => { setTo(e.target.value); }} autoComplete="off" spellCheck={false} />
              <div className="flex gap-2">
                <input className={field} placeholder={`Amount in ${TOKEN_SYMBOL}`} aria-label="Amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); }} />
                <button type="submit" className={primary} disabled={send.isPending}>
                  {send.isPending ? 'Sending…' : 'Send'}
                </button>
              </div>
              <p className="text-xs text-text-2">Signed with your passkey. Network fees are paid in {TOKEN_SYMBOL}.</p>
            </form>
          )}
        </section>

        {/* ----------------------------- the payment session --------------------------- */}
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
              No deposit yet. Your first paid message deposits {deposit} from this wallet into an escrow session with one passkey approval; every paid answer is then charged silently from it, and the unspent part comes back when you withdraw.
              {!canDeposit && ` Your wallet holds less than ${deposit}, so fund it first.`}
            </p>
          )}
          {!alloc.paidRunsEnabled && <p className="mt-2 text-xs text-warn">Paid runs are switched off on the server right now. The free model still works.</p>}
          {hasSession && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={primary}
                onClick={() => {
                  if (!canDeposit) {
                    toast.warn(`Your wallet holds less than ${deposit}`, isTestnet ? 'Get test funds first.' : `Receive ${TOKEN_SYMBOL} at your address first.`);
                    return;
                  }
                  onTopUp();
                }}
                disabled={busy.topUp || alloc.status === 'toppingUp' || alloc.status === 'closing' || !alloc.paidRunsEnabled}
              >
                {busy.topUp ? 'Topping up…' : `Top up ${deposit}`}
              </button>
              <button type="button" className={secondary} onClick={onCloseSession} disabled={busy.close || alloc.status === 'closing'}>
                {busy.close ? 'Withdrawing…' : 'Withdraw'}
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-text-2">No automatic top-ups. Withdraw closes the session and returns the unspent deposit to your wallet; idle sessions close by themselves after 24 h.</p>
          {alloc.weeklyLimitUsd !== null && (
            <p className="num mt-1 text-xs text-text-2">
              This week: {formatUsd(alloc.weeklySpentUsd)} of {formatUsd(alloc.weeklyLimitUsd, { min: 0 })}
            </p>
          )}
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
          <p className="text-xs text-text-2">Signing out clears this device&apos;s session cookie and passkey reference. Your deposit stays in the payment session until you withdraw.</p>
        </section>
      </div>
    </Sheet>
  );
}
