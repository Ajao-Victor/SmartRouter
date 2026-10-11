'use client';

import { useState } from 'react';

import { clsx } from 'clsx';

import { isTestnet } from '@/lib/env';
import { formatUsd, fromUsd, type MicroUsd } from '@/lib/money';

import { useDeposit } from '@/hooks/useDeposit';
import { selectNextDeposit, useAllocationStore } from '@/stores/allocationStore';
import { useUiStore } from '@/stores/uiStore';

import { Dialog } from '@/components/ui/Dialog';

/** Backend bounds for `allocationUsd` (`PATCH /me/settings`: 0.5–100). */
const MIN_USD = 0.5;
const MAX_USD = 100;
const PRESETS = [1, 2, 5, 10] as const;

/**
 * Deposit dialog (Handover "Usage banners" → `top_up`, and "When the deposit runs out"): pick the
 * new deposit, then close-and-reopen. A kept message is sent again once the new deposit is set up;
 * that paid run opens it (one approval).
 */
export function DepositDialog() {
  const open = useUiStore((s) => s.activeDialog === 'deposit');
  const resend = useUiStore((s) => s.depositResend);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const status = useAllocationStore((s) => s.status);
  const remaining = useAllocationStore((s) => s.remainingUsd);
  const current = useAllocationStore(selectNextDeposit);
  const deposit = useDeposit();
  const [amount, setAmount] = useState<string>('');

  const hasSession = status !== 'none' && status !== 'closed';
  const value = amount === '' ? current : fromUsd(Number(amount));
  const valid = Number.isFinite(value) && value >= fromUsd(MIN_USD) && value <= fromUsd(MAX_USD);

  const confirm = (usd: MicroUsd) => {
    deposit.mutate(usd, {
      onSuccess: () => {
        const then = useUiStore.getState().depositResend;
        closeDialog();
        setAmount('');
        then?.();
      },
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!deposit.isPending) closeDialog();
      }}
      title="New deposit"
      description="One approval covers many messages. Each paid answer after that is paid silently from the deposit."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Deposit amount">
          {PRESETS.map((usd) => {
            const selected = value === fromUsd(usd);
            return (
              <button
                key={usd}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setAmount(String(usd));
                }}
                className={clsx('num h-9 rounded-pill px-3.5 text-sm transition-colors', selected ? 'bg-accent/20 text-text-0 shadow-hairline-strong' : 'bg-bg-1 text-text-1 shadow-hairline hocus:bg-bg-2')}
              >
                {formatUsd(fromUsd(usd), { min: 0 })}
              </button>
            );
          })}
          <label className="num flex h-9 items-center gap-1 rounded-pill bg-bg-1 px-3 text-sm text-text-1 shadow-hairline">
            $
            <input
              type="number"
              inputMode="decimal"
              min={MIN_USD}
              max={MAX_USD}
              step="0.5"
              aria-label="Custom amount in USD"
              placeholder={String(current / 1_000_000)}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
              }}
              className="w-16 bg-transparent text-text-0 outline-none"
            />
          </label>
        </div>

        <p className="text-xs text-text-2">
          {hasSession
            ? `Your current deposit closes first: what was spent goes to SmartRouter and the ${formatUsd(remaining)} left returns to your wallet.`
            : 'Your next paid message opens this deposit.'}{' '}
          Paid in {isTestnet ? 'pathUSD (testnet)' : 'USDC.e'}; network fees are on SmartRouter.
        </p>
        {!valid && <p className="text-xs text-signal">Pick between {formatUsd(fromUsd(MIN_USD))} and {formatUsd(fromUsd(MAX_USD), { min: 0 })}.</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={closeDialog} disabled={deposit.isPending} className="inline-flex h-10 items-center rounded-lg bg-bg-2 px-4 text-sm text-text-0 transition-colors hocus:bg-bg-3 disabled:opacity-60">
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || deposit.isPending}
            onClick={() => {
              confirm(value);
            }}
            className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi disabled:opacity-60"
          >
            {deposit.isPending ? (hasSession ? 'Closing the old deposit…' : 'Saving…') : `${resend ? 'Deposit and send' : 'Deposit'} ${formatUsd(value, { min: 0 })}`}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
