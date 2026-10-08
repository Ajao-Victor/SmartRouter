'use client';

import clsx from 'clsx';
import { motion } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, withReduced } from '@/lib/motion/variants';

/** PDF licence requirement: shown under every recommendation. Text is verbatim. */
export const ATTRIBUTION_TEXT = 'Quality data: LMArena, Artificial Analysis';

export function Attribution({ className }: { className?: string }) {
  const reduced = useReducedMotionSafe();
  return (
    <motion.p
      variants={withReduced(fadeUp, reduced)}
      initial="hidden"
      animate="visible"
      className={clsx('num text-2xs tracking-wider-ui text-text-2 uppercase', className)}
    >
      {ATTRIBUTION_TEXT}
    </motion.p>
  );
}
