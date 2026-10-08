'use client';

import { useCallback, useRef } from 'react';

import { useMotionValue, useSpring, type MotionValue } from 'motion/react';

import { springValues } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

export interface MagneticOptions {
  /** Max pull in px (design.md: 8px on buttons). */
  strength?: number;
}

export interface MagneticBindings {
  ref: React.RefObject<HTMLElement | null>;
  style: { x: MotionValue<number>; y: MotionValue<number> };
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

/**
 * Magnetic pull toward the pointer, returning on leave. Zero offset under reduced motion.
 * Usage: `<motion.button ref={m.ref} style={m.style} onPointerMove={m.onPointerMove} …>`.
 */
export function useMagnetic(options: MagneticOptions = {}): MagneticBindings {
  const { strength = 8 } = options;
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLElement | null>(null);
  const x = useSpring(useMotionValue(0), springValues.magnet);
  const y = useSpring(useMotionValue(0), springValues.magnet);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reduced) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      x.set(Math.max(-1, Math.min(1, dx)) * strength);
      y.set(Math.max(-1, Math.min(1, dy)) * strength);
    },
    [reduced, strength, x, y],
  );

  const onPointerLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { ref, style: { x, y }, onPointerMove, onPointerLeave };
}
