'use client';

import { ArrowDownToLine, ArrowLeftRight } from 'lucide-react';
import { motion } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

import { MagneticButton } from '@/components/ui/MagneticButton';

/** Opens Tempo's deposit dialog (`wallet_deposit`): chain, token, amount; paths vary by region (PDF). */
export function DepositButton({ onClick, loading = false }: { onClick: () => void; loading?: boolean }) {
  return (
    <MagneticButton onClick={onClick} loading={loading} className="flex-1">
      <ArrowDownToLine size={16} /> Deposit
    </MagneticButton>
  );
}

/** One-tap swap to USDC.e on Tempo's built-in DEX (`wallet_swap`). Rendered only when needed. */
export function SwapButton({ onClick, loading = false }: { onClick: () => void; loading?: boolean }) {
  const reduced = useReducedMotionSafe();
  return (
    <MagneticButton variant="secondary" onClick={onClick} loading={loading} className="group flex-1">
      <motion.span className="inline-flex" {...(reduced ? {} : { whileHover: { rotate: 360 }, transition: { duration: 0.6 } })}>
        <ArrowLeftRight size={16} />
      </motion.span>
      Swap to USDC.e
    </MagneticButton>
  );
}
