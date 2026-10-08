'use client';

import { forwardRef, useImperativeHandle } from 'react';

import { clsx } from 'clsx';
import { motion, useMotionTemplate, type HTMLMotionProps } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { useTilt } from '@/lib/motion/useTilt';
import { holoCard, holoCardFree, holoCardTeal, withReduced } from '@/lib/motion/variants';

export type HoloTone = 'accent' | 'teal' | 'free';

export interface HoloCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  tone?: HoloTone;
  selected?: boolean;
  /** PDF: dashed = coming soon, not in launch build. */
  dashed?: boolean;
  /** Disable tilt/hover (static panels). */
  interactive?: boolean;
  /** Max tilt degrees (design.md: ±8). */
  tilt?: number;
  children?: React.ReactNode;
}

const toneVariants = { accent: holoCard, teal: holoCardTeal, free: holoCardFree } as const;
const toneSpot = {
  accent: 'rgba(124,92,255,0.28)',
  teal: 'rgba(25,230,193,0.26)',
  free: 'rgba(155,225,93,0.26)',
} as const;

/**
 * Glass card with 3D pointer tilt (magnet springs), a pointer-following spotlight, a rotating
 * conic beam border when selected, and rest/hover/selected/tap spring variants.
 */
export const HoloCard = forwardRef<HTMLDivElement, HoloCardProps>(function HoloCard(
  {
    tone = 'accent',
    selected = false,
    dashed = false,
    interactive = true,
    tilt = 8,
    className,
    children,
    style,
    onPointerMove,
    onPointerLeave,
    ...rest
  },
  ref,
) {
  const reduced = useReducedMotionSafe();
  const t = useTilt({ max: interactive ? tilt : 0 });
  useImperativeHandle(ref, () => t.ref.current as HTMLDivElement);
  const spotlight = useMotionTemplate`radial-gradient(220px circle at ${t.spotlightPosition}, ${toneSpot[tone]}, transparent 70%)`;
  const variants = withReduced(toneVariants[tone], reduced);

  return (
    <motion.div
      ref={t.ref}
      data-selected={selected ? 'true' : 'false'}
      className={clsx(
        'conic-border relative rounded-lg',
        dashed ? 'dashed-card' : 'glass',
        interactive && 'cursor-pointer',
        className,
      )}
      style={{ ...(interactive && !reduced ? t.style : {}), ...style }}
      variants={variants}
      initial="rest"
      animate={selected ? 'selected' : 'rest'}
      {...(interactive && !reduced ? { whileHover: 'hover', whileTap: 'tap' } : {})}
      onPointerMove={(e) => {
        t.onPointerMove(e);
        onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        t.onPointerLeave();
        onPointerLeave?.(e);
      }}
      {...rest}
    >
      {selected && !dashed && (
        <>
          <span aria-hidden="true" className="conic-border-ring" />
          <span aria-hidden="true" className="conic-border-mask" />
        </>
      )}
      {interactive && !reduced && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover:opacity-100"
          style={{ backgroundImage: spotlight }}
        />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
});
