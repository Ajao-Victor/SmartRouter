'use client';

import { useCallback, useRef } from 'react';

import { useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';

import { springValues } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

export interface TiltOptions {
  /** Max rotation in degrees (design.md: ±8° on HoloCard). */
  max?: number;
  /** Glare/spotlight position is exposed as percentages for a radial highlight. */
  spotlight?: boolean;
}

export interface TiltBindings {
  ref: React.RefObject<HTMLDivElement | null>;
  style: {
    rotateX: MotionValue<number>;
    rotateY: MotionValue<number>;
    transformPerspective: number;
  };
  /** CSS-friendly `${x}% ${y}%` for a radial spotlight. */
  spotlightPosition: MotionValue<string>;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

/**
 * 3D pointer tilt on magnet springs. Rotation is zero under reduced motion.
 * Usage: `<motion.div {...tilt} className="preserve-3d">`.
 */
export function useTilt(options: TiltOptions = {}): TiltBindings {
  const { max = 8 } = options;
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement | null>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(
    useTransform(py, [0, 1], [max, -max]),
    springValues.magnet,
  );
  const rotateY = useSpring(
    useTransform(px, [0, 1], [-max, max]),
    springValues.magnet,
  );
  const spotlightPosition = useTransform([px, py], ([x, y]) => {
    const xs = typeof x === 'number' ? x : 0.5;
    const ys = typeof y === 'number' ? y : 0.5;
    return `${String(Math.round(xs * 100))}% ${String(Math.round(ys * 100))}%`;
  });

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reduced) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      px.set((e.clientX - rect.left) / rect.width);
      py.set((e.clientY - rect.top) / rect.height);
    },
    [px, py, reduced],
  );

  const onPointerLeave = useCallback(() => {
    px.set(0.5);
    py.set(0.5);
  }, [px, py]);

  return {
    ref,
    style: { rotateX, rotateY, transformPerspective: 900 },
    spotlightPosition,
    onPointerMove,
    onPointerLeave,
  };
}
