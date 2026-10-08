'use client';

import { forwardRef } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';
import { motion, type HTMLMotionProps } from 'motion/react';

import { springs } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

const button = cva(
  [
    'relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden',
    'rounded-pill font-medium whitespace-nowrap transition-[box-shadow,background-color,color] duration-200',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  ],
  {
    variants: {
      variant: {
        /** Router beam: primary money/run actions. */
        primary: 'bg-beam text-text-inverse shadow-glow-accent hocus:shadow-glow-accent-strong',
        /** Glass: secondary actions. */
        secondary: 'glass text-text-0 hocus:shadow-glow-accent',
        ghost: 'bg-transparent text-text-1 hocus:bg-bg-2 hocus:text-text-0',
        /** Danger is deliberately plain (design.md §6: no gamified destructive actions). */
        danger: 'border border-signal/40 bg-signal/10 text-signal hocus:bg-signal/20',
        /** Free model identity. */
        free: 'bg-free/15 text-free shadow-glow-free hocus:bg-free/25',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'hit-44 h-11 px-5 text-sm',
        lg: 'hit-44 h-13 px-7 text-base',
        icon: 'hit-44 h-11 w-11 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof button>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof button>['size']>;

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof button> {
  loading?: boolean;
  /** Suppress the hover sheen (e.g. inside dense lists). */
  flat?: boolean;
  children?: React.ReactNode;
}

/**
 * Base button on spring physics: lifts on hover (magnet spring), compresses on tap (snappy),
 * primary variants carry a beam gradient with a sheen sweep. Under reduced motion only
 * colour/shadow transitions remain.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading = false, flat = false, disabled, children, type, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe();
  const isDisabled = disabled === true || loading;
  const motionProps =
    reduced || isDisabled
      ? {}
      : {
          whileHover: { scale: 1.02, transition: springs.magnet },
          whileTap: { scale: 0.97, transition: springs.snappy },
        };

  return (
    <motion.button
      ref={ref}
      type={type ?? 'button'}
      className={clsx(button({ variant, size }), className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...motionProps}
      {...rest}
    >
      {!flat && (variant ?? 'primary') === 'primary' && (
        <span
          aria-hidden="true"
          className="shimmer-line motion-ok:opacity-100 pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity"
        />
      )}
      {loading && (
        <motion.span
          aria-hidden="true"
          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
          {...(reduced
            ? {}
            : { animate: { rotate: 360 }, transition: { repeat: Infinity, duration: 0.8, ease: 'linear' } })}
        />
      )}
      <span className={clsx('inline-flex items-center gap-2', loading && 'opacity-80')}>{children}</span>
    </motion.button>
  );
});
