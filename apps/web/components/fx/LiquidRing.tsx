'use client';

import { useEffect, useId } from 'react';

import { clsx } from 'clsx';
import { animate, motion, useMotionValue, useSpring, useTransform } from 'motion/react';

import { springValues } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { hud, withReduced } from '@/lib/motion/variants';

export type RingState = 'ok' | 'low' | 'used' | 'toppingUp';

export interface LiquidRingProps {
  /** Fill level 0..1 (remaining / deposit). */
  level: number;
  state?: RingState;
  /** Outer diameter in px. */
  size?: number;
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
}

const ringColor: Record<RingState, string> = {
  ok: 'var(--accent-2)',
  low: 'var(--warn)',
  used: 'var(--signal)',
  toppingUp: 'var(--accent)',
};

/**
 * Allocation HUD ring (design.md §2 LiquidRing): a liquid fill whose surface wobbles via
 * feTurbulence + feDisplacementMap, level on the liquid spring, colour via `data-state` CSS
 * variables, and hud variants for ok/low-pulse/used/toppingUp-spin.
 */
export function LiquidRing({ level, state = 'ok', size = 64, className, children, ...aria }: LiquidRingProps) {
  const reduced = useReducedMotionSafe();
  const id = useId();
  const r = size / 2;
  const inner = r - 4;

  const target = useMotionValue(Math.min(1, Math.max(0, level)));
  const spring = useSpring(target, springValues.liquid);
  const fillY = useTransform(spring, (v) => r + inner - v * inner * 2);
  const seed = useMotionValue(0);
  const seedStr = useTransform(seed, (v) => String(Math.round(v)));

  useEffect(() => {
    target.set(Math.min(1, Math.max(0, level)));
    if (reduced) spring.jump(Math.min(1, Math.max(0, level)));
  }, [level, target, spring, reduced]);

  useEffect(() => {
    if (reduced) return;
    const controls = animate(seed, [0, 60], { duration: 6, repeat: Infinity, repeatType: 'reverse', ease: 'linear' });
    return () => {
      controls.stop();
    };
  }, [seed, reduced]);

  return (
    <motion.div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Math.round(level * 100) / 100}
      {...(aria['aria-label'] ? { 'aria-label': aria['aria-label'] } : {})}
      data-state={state}
      className={clsx('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size, ['--ring' as string]: ringColor[state] }}
      variants={withReduced(hud, reduced)}
      animate={state}
    >
      <svg width={size} height={size} viewBox={`0 0 ${String(size)} ${String(size)}`} className="absolute inset-0">
        <defs>
          <clipPath id={`${id}-clip`}>
            <circle cx={r} cy={r} r={inner} />
          </clipPath>
          <filter id={`${id}-wobble`} x="-20%" y="-20%" width="140%" height="140%">
            <motion.feTurbulence type="fractalNoise" baseFrequency="0.035 0.08" numOctaves={2} seed={seedStr} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={reduced ? 0 : 5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id={`${id}-liquid`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ring)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--ring)" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle cx={r} cy={r} r={r - 2} fill="none" stroke="var(--line-strong)" strokeWidth={1.5} />
        {/* glow ring */}
        <circle cx={r} cy={r} r={r - 2} fill="none" stroke="var(--ring)" strokeWidth={1.5} opacity={0.9} style={{ filter: 'drop-shadow(0 0 6px var(--ring))' }} />
        {/* liquid */}
        <g clipPath={`url(#${id}-clip)`}>
          <motion.rect
            x={-size * 0.25}
            width={size * 1.5}
            height={size * 2}
            y={fillY}
            fill={`url(#${id}-liquid)`}
            filter={`url(#${id}-wobble)`}
          />
        </g>
      </svg>
      <div className="num relative text-xs font-medium text-text-0">{children}</div>
    </motion.div>
  );
}
