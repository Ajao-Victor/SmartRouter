'use client';

import { useId, useState } from 'react';

import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeScale, withReduced } from '@/lib/motion/variants';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<{ 'aria-describedby'?: string }>;
  side?: 'top' | 'bottom';
  className?: string;
}

/** Minimal hover/focus tooltip on a snappy scale-in. */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotionSafe();
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => {
        setOpen(true);
      }}
      onPointerLeave={() => {
        setOpen(false);
      }}
      onFocus={() => {
        setOpen(true);
      }}
      onBlur={() => {
        setOpen(false);
      }}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            variants={withReduced(fadeScale, reduced)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={clsx(
              'glass-strong pointer-events-none absolute left-1/2 z-toast w-max max-w-xs -translate-x-1/2 rounded-md px-3 py-1.5 text-xs text-text-0',
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
              className,
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
