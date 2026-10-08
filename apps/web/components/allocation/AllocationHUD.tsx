'use client';

import { useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import { formatUsd, type MicroUsd } from '@/lib/money';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeScale, withReduced } from '@/lib/motion/variants';

import { selectIsLow, selectRemainingPct, useAllocationStore } from '@/stores/allocationStore';

import { LiquidRing, type RingState } from '@/components/fx/LiquidRing';
import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/ui/MagneticButton';

export interface AllocationHUDProps {
  /** Top-up / open amount (user setting; PDF default $2). */
  allocationMicro: MicroUsd;
  onTopUp: () => void;
  onOpenAllocation: () => void;
}

/**
 * TopBar HUD (design.md §4.2): LiquidRing of remaining/deposit with ok/low/used/toppingUp
 * states; tapping opens a floating panel with the numbers and the Top up button.
 */
export function AllocationHUD({ allocationMicro, onTopUp, onOpenAllocation }: AllocationHUDProps) {
  const reduced = useReducedMotionSafe();
  const status = useAllocationStore((s) => s.status);
  const remaining = useAllocationStore((s) => s.remainingMicro);
  const deposit = useAllocationStore((s) => s.depositMicro);
  const highest = useAllocationStore((s) => s.highestVoucherMicro);
  const pct = useAllocationStore(selectRemainingPct);
  const low = useAllocationStore(selectIsLow);
  const [open, setOpen] = useState(false);

  if (status === 'none' || status === 'closed') {
    return (
      <Button size="sm" variant="secondary" onClick={onOpenAllocation}>
        Open allocation · {formatUsd(allocationMicro, { min: 0 })}
      </Button>
    );
  }

  const ring: RingState = status === 'toppingUp' ? 'toppingUp' : status === 'used' ? 'used' : low ? 'low' : 'ok';

  return (
    <div className="relative" data-hud="allocation">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Allocation: ${formatUsd(remaining)} remaining of ${formatUsd(deposit)}`}
        onClick={() => {
          setOpen((o) => !o);
        }}
        className="rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <LiquidRing level={pct} state={ring} size={44}>
          <span className="text-2xs">{formatUsd(remaining, { min: 2, max: 2 })}</span>
        </LiquidRing>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            variants={withReduced(fadeScale, reduced)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass-strong absolute top-full right-0 z-drawer mt-2 w-64 rounded-lg p-4 shadow-glow-accent"
          >
            <dl className="num space-y-1.5 text-xs">
              <div className="flex justify-between"><dt className="text-text-2">Deposit</dt><dd className="text-text-0">{formatUsd(deposit)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-2">Used</dt><dd className="text-text-0">{formatUsd(highest)}</dd></div>
              <div className="flex justify-between"><dt className="text-text-2">Remaining</dt><dd className={status === 'used' ? 'text-signal' : 'text-accent-2'}>{formatUsd(remaining)}</dd></div>
            </dl>
            <MagneticButton className="mt-3 w-full" size="sm" loading={status === 'toppingUp'} onClick={onTopUp}>
              Top up {formatUsd(allocationMicro, { min: 0 })}
            </MagneticButton>
            <p className="mt-2 text-2xs text-text-2">No automatic top-ups. Unused allocation returns to your wallet.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
