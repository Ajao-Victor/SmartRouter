'use client';

import { useCallback } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

import { useFxStore, type Trail } from '@/stores/fxStore';

function center(el: Element): [number, number] {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

/** Build a smooth path through element centres (viewport coords). */
export function trailPath(from: Element, to: readonly Element[]): string {
  const pts = [center(from), ...to.map(center)];
  const first = pts[0];
  if (!first) return '';
  let d = `M ${String(first[0])} ${String(first[1])}`;
  for (let i = 1; i < pts.length; i += 1) {
    const prev = pts[i - 1];
    const next = pts[i];
    if (!prev || !next) continue;
    const cx = (prev[0] + next[0]) / 2;
    const cy = prev[1] - Math.abs(next[0] - prev[0]) * 0.15 - 24;
    d += ` Q ${String(cx)} ${String(cy)} ${String(next[0])} ${String(next[1])}`;
  }
  return d;
}

/** Imperative API: draw a light beam from one element through others (design.md "routing" moment). */
export function useGlowTrail() {
  const reduced = useReducedMotionSafe();
  const addTrail = useFxStore((s) => s.addTrail);
  return useCallback(
    (from: Element | null, to: readonly (Element | null)[], color: Trail['color'] = 'accent') => {
      if (reduced || !from) return;
      const targets = to.filter((e): e is Element => e !== null);
      if (targets.length === 0) return;
      addTrail({ d: trailPath(from, targets), color });
    },
    [reduced, addTrail],
  );
}

const stroke: Record<Trail['color'], [string, string]> = {
  accent: ['var(--accent-2)', 'var(--accent)'],
  teal: ['var(--accent-2)', 'var(--accent-2-hi)'],
  free: ['var(--free)', 'var(--accent-2)'],
};

function TrailPath({ trail }: { trail: Trail }) {
  const remove = useFxStore((s) => s.removeTrail);
  const [a, b] = stroke[trail.color];
  return (
    <>
      <defs>
        <linearGradient id={`${trail.id}-g`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100%" y2="0">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
      </defs>
      <motion.path
        d={trail.d}
        fill="none"
        stroke={`url(#${trail.id}-g)`}
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 8px var(--accent))' }}
        initial={{ pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: [1, 1, 0] }}
        transition={{ pathLength: { duration: 0.6, ease: 'easeOut' }, opacity: { duration: 1.1, times: [0, 0.6, 1] } }}
        onAnimationComplete={() => {
          remove(trail.id);
        }}
      />
    </>
  );
}

/** Fixed SVG layer that renders active trails. Mount once (root layout). */
export function GlowTrailLayer() {
  const trails = useFxStore((s) => s.trails);
  return (
    <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-dock h-full w-full">
      <AnimatePresence>
        {trails.map((t) => (
          <TrailPath key={t.id} trail={t} />
        ))}
      </AnimatePresence>
    </svg>
  );
}
