'use client';

import { useEffect, useState } from 'react';

import { clsx } from 'clsx';
import { AnimatePresence, motion, type Variants } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

export interface GlitchTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'p';
  /** Re-run the glitch when this changes (defaults to `text`). */
  triggerKey?: string | number;
}

const DURATION = 0.6;

const sliceA = {
  hidden: { opacity: 0 },
  visible: {
    opacity: [0, 1, 1, 0],
    x: [-3, 2, -2, 0],
    clipPath: ['inset(0 0 85% 0)', 'inset(40% 0 30% 0)', 'inset(10% 0 60% 0)', 'inset(0 0 100% 0)'],
    transition: { duration: DURATION, times: [0, 0.3, 0.7, 1] },
  },
} satisfies Variants;

const sliceB = {
  hidden: { opacity: 0 },
  visible: {
    opacity: [0, 1, 1, 0],
    x: [3, -2, 2, 0],
    clipPath: ['inset(70% 0 0 0)', 'inset(10% 0 60% 0)', 'inset(55% 0 20% 0)', 'inset(100% 0 0 0)'],
    transition: { duration: DURATION, times: [0, 0.3, 0.7, 1], delay: 0.04 },
  },
} satisfies Variants;

const base = {
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.35, delay: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
} satisfies Variants;

/**
 * Three-layer glitch reveal: two hue-shifted slices tear across while the base text blurs in
 * (design.md §2). Runs once per `triggerKey`. Reduced motion → plain text.
 */
export function GlitchText({ text, className, as = 'span', triggerKey }: GlitchTextProps) {
  const reduced = useReducedMotionSafe();
  const key = triggerKey ?? text;
  const [active, setActive] = useState(!reduced);

  useEffect(() => {
    if (reduced) return;
    setActive(true);
    const t = window.setTimeout(() => {
      setActive(false);
    }, DURATION * 1000 + 50);
    return () => {
      window.clearTimeout(t);
    };
  }, [key, reduced]);

  const Tag = motion[as];

  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{text}</Plain>;
  }

  return (
    <span className={clsx('relative inline-block', className)}>
      <span className="sr-only">{text}</span>
      <AnimatePresence mode="wait" initial>
        <Tag
          key={String(key)}
          variants={base}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative"
          aria-hidden="true"
        >
          {text}
        </Tag>
      </AnimatePresence>
      {active && (
        <>
          <motion.span
            key={`a-${String(key)}`}
            aria-hidden="true"
            variants={sliceA}
            initial="hidden"
            animate="visible"
            className="pointer-events-none absolute inset-0 text-accent-2"
          >
            {text}
          </motion.span>
          <motion.span
            key={`b-${String(key)}`}
            aria-hidden="true"
            variants={sliceB}
            initial="hidden"
            animate="visible"
            className="pointer-events-none absolute inset-0 text-accent"
          >
            {text}
          </motion.span>
        </>
      )}
    </span>
  );
}
