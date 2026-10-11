'use client';

import { formatUsd, type MicroUsd } from '@/lib/money';

export interface TopUpBarProps {
  /** Top-up amount = the backend's suggested deposit (PDF default $2). */
  topUpUsd: MicroUsd;
  onTopUp: () => void;
  onContinueFree: () => void;
  /** Weekly limit: open settings to raise `weeklyLimitUsd`. */
  onRaiseLimit?: () => void;
  /** PDF `details.freeFallback.available` — hide Continue free when the free quota is used up. */
  freeAvailable?: boolean;
  freeRemaining?: number | null;
  toppingUp?: boolean;
  /** PDF: weekly limit reached — top-ups will not help until it resets. */
  reason?: 'allocation' | 'weekly_limit';
}

/** PDF copy: "Allocation used — Top up $2" with Top up | Continue free side by side. */
export function TopUpBar({ topUpUsd, onTopUp, onContinueFree, onRaiseLimit, freeAvailable = true, freeRemaining = null, toppingUp = false, reason = 'allocation' }: TopUpBarProps) {
  const amount = formatUsd(topUpUsd, { min: 0 });
  return (
    <section role="alert" aria-label="Allocation used" className="space-y-3 rounded-xl bg-bg-1 p-4 shadow-hairline-strong">
      <div>
        <h3 className="text-base font-medium text-text-0">{reason === 'weekly_limit' ? 'Weekly spending limit reached' : `Allocation used — Top up ${amount}`}</h3>
        <p className="mt-0.5 text-sm text-text-2">
          {reason === 'weekly_limit'
            ? 'Raise the limit in Settings or continue on the free model.'
            : 'Your message is kept. Open a new deposit (one approval) and it sends right after, or continue on the free model.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {reason === 'weekly_limit' && onRaiseLimit && (
          <button
            type="button"
            onClick={onRaiseLimit}
            className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi"
          >
            Raise limit
          </button>
        )}
        {reason !== 'weekly_limit' && (
          <button
            type="button"
            onClick={onTopUp}
            disabled={toppingUp}
            className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi disabled:opacity-60"
          >
            {toppingUp ? 'Topping up…' : `Top up ${amount}`}
          </button>
        )}
        <button
          type="button"
          onClick={onContinueFree}
          disabled={!freeAvailable}
          className="inline-flex h-10 items-center rounded-lg bg-free/15 px-4 text-sm font-medium text-free transition-colors hocus:bg-free/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue free
        </button>
      </div>
      {!freeAvailable ? (
        <p className="text-xs text-text-2">Free messages for today are used up. They reset at 00:00 UTC.</p>
      ) : freeRemaining !== null ? (
        <p className="text-xs text-text-2">{String(freeRemaining)} free messages left today.</p>
      ) : null}
    </section>
  );
}
