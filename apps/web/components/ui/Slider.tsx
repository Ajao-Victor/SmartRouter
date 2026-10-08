'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { clsx } from 'clsx';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

import { springValues } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

export interface SliderDetent {
  label: string;
  /** Short caption shown under the detent on wider screens. */
  caption?: string;
}

export interface SliderProps {
  detents: readonly SliderDetent[];
  /** Index of the active detent. */
  value: number;
  onChange: (index: number) => void;
  'aria-label': string;
  className?: string;
  disabled?: boolean;
}

/**
 * Mechanical detent slider (design.md §4.4). The thumb follows the pointer freely while
 * dragging, then snaps to the nearest detent on release on a snappy spring. Each snap
 * triggers a brief "click" scale on the thumb. Track is the beam gradient teal→violet→blue.
 * Keyboard: ←/→, Home/End. `role="slider"` with valuetext from the detent label.
 */
export function Slider({ detents, value, onChange, className, disabled = false, ...aria }: SliderProps) {
  const reduced = useReducedMotionSafe();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const id = useId();
  const max = detents.length - 1;
  const pctFor = useCallback((index: number) => (max <= 0 ? 0 : (index / max) * 100), [max]);

  const pct = useMotionValue(pctFor(value));
  const springPct = useSpring(pct, springValues.snappy);
  const thumbLeft = useTransform(springPct, (v) => `${String(v)}%`);
  const [dragging, setDragging] = useState(false);
  const [clickKey, setClickKey] = useState(0);

  useEffect(() => {
    if (dragging) return;
    if (reduced) springPct.jump(pctFor(value));
    pct.set(pctFor(value));
  }, [value, dragging, pct, springPct, pctFor, reduced]);

  const indexFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * max);
  };

  const commit = (index: number) => {
    if (index !== value) {
      onChange(index);
      setClickKey((k) => k + 1);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const el = trackRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      pct.set(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)));
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || disabled) return;
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pct.set(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    const next = indexFromClientX(e.clientX);
    pct.set(pctFor(next));
    commit(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    };
    let next = value;
    if (e.key in step) next = Math.min(max, Math.max(0, value + (step[e.key] ?? 0)));
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = max;
    else return;
    e.preventDefault();
    commit(next);
  };

  const current = detents[value];

  return (
    <div className={clsx('w-full select-none', disabled && 'opacity-50', className)}>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={aria['aria-label']}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={current?.label ?? ''}
        aria-disabled={disabled || undefined}
        className="relative h-11 cursor-pointer touch-none rounded-pill focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {/* track */}
        <div className="bg-slider-track absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-pill opacity-80" />
        {/* detent ticks */}
        {detents.map((d, i) => (
          <button
            key={`${id}-${d.label}`}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled}
            onClick={() => {
              commit(i);
            }}
            className={clsx(
              'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[box-shadow,background-color] duration-200',
              i === value ? 'bg-text-0 shadow-glow-accent' : 'bg-bg-3 shadow-hairline-strong',
            )}
            style={{ left: `${String(pctFor(i))}%` }}
          />
        ))}
        {/* thumb */}
        <motion.div
          aria-hidden="true"
          className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-1 shadow-glow-accent-strong"
          style={{ left: thumbLeft }}
        >
          <motion.span
            key={clickKey}
            className="bg-beam absolute inset-1 rounded-full"
            initial={reduced ? false : { scale: 0.7 }}
            animate={{ scale: dragging ? 1.15 : 1 }}
            transition={springValues.bouncy}
          />
        </motion.div>
      </div>
      <div className="mt-1 flex justify-between">
        {detents.map((d, i) => (
          <button
            key={`${id}-label-${d.label}`}
            type="button"
            disabled={disabled}
            onClick={() => {
              commit(i);
            }}
            className={clsx(
              'num text-2xs tracking-wider-ui uppercase transition-colors',
              i === value ? 'text-text-0' : 'text-text-2 hocus:text-text-1',
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
