'use client';

import { motion } from 'motion/react';

import { formatUsd, type MicroUsd } from '@/lib/money';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, meetFromLeft, meetFromRight, withReduced } from '@/lib/motion/variants';

import { GlitchText } from '@/components/fx/GlitchText';
import { MagneticButton } from '@/components/ui/MagneticButton';

export interface TopUpBarProps {
  /** Top-up amount = the user's allocation setting (PDF default $2). */
  topUpMicro: MicroUsd;
  onTopUp: () => void;
  onContinueFree: () => void;
  /** PDF: with auto free fallback on (default) the chat carries on with the free model and says so. */
  autoFree?: boolean;
  /** Free quota exhausted → hide Continue free. */
  freeAvailable?: boolean;
  toppingUp?: boolean;
}

/** PDF copy: "Allocation used — Top up $2" with Top up | Continue free side by side. */
export function TopUpBar({ topUpMicro, onTopUp, onContinueFree, autoFree = false, freeAvailable = true, toppingUp = false }: TopUpBarProps) {
  const reduced = useReducedMotionSafe();
  const amount = formatUsd(topUpMicro, { min: 0 });

  if (autoFree && freeAvailable) {
    return (
      <motion.p
        role="status"
        variants={withReduced(fadeUp, reduced)}
        initial="hidden"
        animate="visible"
        className="glass rounded-pill px-4 py-2 text-sm text-free"
      >
        Allocation used — continuing free
      </motion.p>
    );
  }

  return (
    <motion.section
      role="alert"
      aria-label="Allocation used"
      variants={withReduced(fadeUp, reduced)}
      initial="hidden"
      animate="visible"
      className="glass-strong space-y-4 rounded-lg p-4 shadow-glow-signal"
    >
      <h3 className="font-display text-lg text-text-0">
        <GlitchText text={`Allocation used — Top up ${amount}`} />
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <motion.div variants={withReduced(meetFromLeft, reduced)}>
          <MagneticButton className="w-full" size="lg" onClick={onTopUp} loading={toppingUp}>
            Top up {amount}
          </MagneticButton>
        </motion.div>
        <motion.div variants={withReduced(meetFromRight, reduced)}>
          <MagneticButton className="w-full" size="lg" variant="free" onClick={onContinueFree} disabled={!freeAvailable}>
            Continue free
          </MagneticButton>
        </motion.div>
      </div>
      {!freeAvailable && <p className="text-xs text-text-2">Free messages for today are used up (30/30).</p>}
    </motion.section>
  );
}
