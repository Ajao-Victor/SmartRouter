'use client';

import { forwardRef, useEffect, useState } from 'react';

import { clsx } from 'clsx';
import { motion, type HTMLMotionProps } from 'motion/react';

import { dragPhysics } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { dock, withReduced } from '@/lib/motion/variants';

export interface FloatingDockProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  focused?: boolean;
  /** Increment to trigger the cooldown shake (429 / disabled run). */
  shakeKey?: number;
  /** Fixed to the viewport bottom (default) or inline (dev galleries). */
  floating?: boolean;
  children?: React.ReactNode;
}

/**
 * Glass dock floating above the bottom edge (design.md §4.3): lifts when focused, can be
 * dragged up to 24px and snaps home on the soft spring, shakes on cooldown.
 */
export const FloatingDock = forwardRef<HTMLDivElement, FloatingDockProps>(function FloatingDock(
  { focused = false, shakeKey = 0, floating = true, className, children, ...rest },
  ref,
) {
  const reduced = useReducedMotionSafe();
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (shakeKey === 0) return;
    setShaking(true);
    const t = window.setTimeout(() => {
      setShaking(false);
    }, 450);
    return () => {
      window.clearTimeout(t);
    };
  }, [shakeKey]);

  const state = shaking ? 'cooldown' : focused ? 'focused' : 'idle';

  return (
    <motion.div
      ref={ref}
      className={clsx(
        'glass-strong rounded-xl',
        floating && 'dock-float mx-auto max-w-3xl',
        focused ? 'shadow-glow-accent' : 'shadow-dock',
        className,
      )}
      variants={withReduced(dock, reduced)}
      initial="idle"
      animate={state}
      {...(reduced
        ? {}
        : {
            drag: 'y' as const,
            dragConstraints: { top: -24, bottom: 0 },
            dragElastic: dragPhysics.dragElastic,
            dragSnapToOrigin: true,
            dragTransition: dragPhysics.dragTransition,
          })}
      {...rest}
    >
      {children}
    </motion.div>
  );
});
