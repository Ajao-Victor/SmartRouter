'use client';

import { useEffect, useRef, useState } from 'react';

import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

import { springValues } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { tick } from '@/lib/motion/variants';

export interface NumberTickerProps {
  /** Numeric value to display (any unit). */
  value: number;
  /** Formatter from the interpolated number to text (default: integer). */
  format?: (n: number) => string;
  className?: string;
  /** Announce changes to screen readers. */
  live?: boolean;
}

/**
 * Animated number: springs between values and lifts on change (design.md §2 NumberTicker).
 * Reduced motion → instant text. Wrap in `.num` for tabular digits.
 */
export function NumberTicker({ value, format, className, live = true }: NumberTickerProps) {
  const reduced = useReducedMotionSafe();
  const fmt = format ?? ((n: number) => String(Math.round(n)));
  const raw = useMotionValue(value);
  const spring = useSpring(raw, springValues.snappy);
  const text = useTransform(spring, (n) => fmt(n));
  const prev = useRef(value);
  const [direction, setDirection] = useState<'idle' | 'up' | 'down'>('idle');

  useEffect(() => {
    if (reduced) {
      spring.jump(value);
      raw.set(value);
    } else {
      raw.set(value);
    }
    if (value !== prev.current) {
      setDirection(value > prev.current ? 'up' : 'down');
      prev.current = value;
    }
  }, [value, raw, spring, reduced]);

  if (reduced) {
    return (
      <span className={className} aria-live={live ? 'polite' : undefined}>
        {fmt(value)}
      </span>
    );
  }

  return (
    <motion.span
      className={className}
      aria-live={live ? 'polite' : undefined}
      variants={tick}
      animate={direction}
      onAnimationComplete={() => {
        setDirection('idle');
      }}
    >
      {text}
    </motion.span>
  );
}
