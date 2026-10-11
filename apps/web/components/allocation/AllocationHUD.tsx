'use client';

import { clsx } from 'clsx';
import { Wallet } from 'lucide-react';

import { formatUsd } from '@/lib/money';

import { selectIsLow, useAllocationStore } from '@/stores/allocationStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * TopBar HUD: the remaining deposit from `/sessions/current` as a small pill that opens the
 * wallet sheet. Before the first paid run there is no session, so it just says Wallet.
 */
export function AllocationHUD() {
  const status = useAllocationStore((s) => s.status);
  const remaining = useAllocationStore((s) => s.remainingUsd);
  const deposit = useAllocationStore((s) => s.depositUsd);
  const low = useAllocationStore(selectIsLow);
  const toggleWallet = useUiStore((s) => s.toggleWallet);
  const hasSession = status !== 'none' && status !== 'closed';
  const label = hasSession ? `Allocation: ${formatUsd(remaining)} remaining of ${formatUsd(deposit)}` : 'Wallet';

  return (
    <button
      type="button"
      data-hud="allocation"
      aria-label={label}
      onClick={() => {
        toggleWallet();
      }}
      className={clsx(
        'num inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors hocus:bg-bg-2',
        status === 'used' ? 'text-signal' : low ? 'text-warn' : hasSession ? 'text-accent-2' : 'text-text-1 hocus:text-text-0',
      )}
    >
      <Wallet size={16} aria-hidden="true" />
      {hasSession ? (status === 'toppingUp' ? 'Topping up…' : formatUsd(remaining)) : <span className="hidden sm:inline">Wallet</span>}
    </button>
  );
}
