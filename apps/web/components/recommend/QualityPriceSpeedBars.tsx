'use client';

import { motion } from 'motion/react';

import { springs } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

export interface QualityPriceSpeedBarsProps {
  /** 0..1 each (higher = better). */
  quality: number;
  price: number;
  speed: number;
}

const rows = [
  ['Quality', 'quality', 'bg-quality'],
  ['Price', 'price', 'bg-price'],
  ['Speed', 'speed', 'bg-speed'],
] as const;

/** Three thin bars that grow in on the soft spring — one per ranking dimension. */
export function QualityPriceSpeedBars({ quality, price, speed }: QualityPriceSpeedBarsProps) {
  const reduced = useReducedMotionSafe();
  const values = { quality, price, speed };
  return (
    <dl className="space-y-1">
      {rows.map(([label, key, cls]) => (
        <div key={key} className="flex items-center gap-2">
          <dt className="num w-11 text-2xs text-text-2">{label}</dt>
          <dd className="h-1 flex-1 overflow-hidden rounded-pill bg-bg-3">
            <motion.div
              className={`h-full rounded-pill ${cls}`}
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${String(Math.round(Math.min(1, Math.max(0, values[key])) * 100))}%` }}
              transition={reduced ? { duration: 0 } : springs.soft}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}
