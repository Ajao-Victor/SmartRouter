'use client';

import { forwardRef } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { motion, type HTMLMotionProps } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { chip, withReduced } from '@/lib/motion/variants';

const chipStyles = cva(
  [
    'inline-flex h-9 items-center gap-1.5 rounded-pill px-3.5 text-sm font-medium select-none [@media(pointer:coarse)]:min-h-11',
    'glass text-text-1 transition-[box-shadow,color,background-color] duration-200',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'selected:text-text-0',
  ],
  {
    variants: {
      tone: {
        accent: 'hocus:text-text-0 selected:shadow-glow-accent-strong',
        free: 'hocus:text-free selected:text-free selected:shadow-glow-free',
        quality: 'hocus:text-quality selected:text-quality selected:shadow-glow-accent',
        teal: 'hocus:text-accent-2 selected:text-accent-2 selected:shadow-glow-teal',
        neutral: 'hocus:text-text-0 selected:shadow-hairline-strong',
      },
    },
    defaultVariants: { tone: 'accent' },
  },
);

export interface ChipProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof chipStyles> {
  selected?: boolean;
  children?: React.ReactNode;
}

/** Pill chip (task categories, tags, suggestions). Springy hover/tap, glow when selected. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { className, tone, selected = false, children, type, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe();
  const variants = withReduced(chip, reduced);
  return (
    <motion.button
      ref={ref}
      type={type ?? 'button'}
      data-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
      className={clsx(chipStyles({ tone }), className)}
      variants={variants}
      initial="idle"
      animate={selected ? 'selected' : 'idle'}
      {...(reduced ? {} : { whileHover: 'hover', whileTap: 'tap' })}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
