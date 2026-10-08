'use client';

import { useEffect, useState } from 'react';

import { clsx } from 'clsx';
import { motion } from 'motion/react';

import { QUOTE_TTL_MS } from '@/lib/api/keys';

export interface QuoteRingProps {
  /** ISO expiry from the quote (PDF: valid 5 minutes). */
  expiresAt: string;
  onExpired?: () => void;
  size?: number;
  className?: string;
}

const WARN_MS = 60_000;

/**
 * Countdown ring for quote validity: full at issue, amber under 60 s, empty + `onExpired` at 0.
 * Announces remaining time for assistive tech.
 */
export function QuoteRing({ expiresAt, onExpired, size = 22, className }: QuoteRingProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Date.parse(expiresAt) - Date.now()));

  useEffect(() => {
    const tick = () => {
      setRemaining(Math.max(0, Date.parse(expiresAt) - Date.now()));
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(t);
    };
  }, [expiresAt]);

  useEffect(() => {
    if (remaining === 0) onExpired?.();
  }, [remaining, onExpired]);

  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, remaining / QUOTE_TTL_MS);
  const warn = remaining > 0 && remaining <= WARN_MS;
  const expired = remaining === 0;
  const seconds = Math.ceil(remaining / 1000);

  return (
    <span
      role="timer"
      aria-label={expired ? 'Quote expired' : `Quote valid for ${String(seconds)} seconds`}
      data-state={expired ? 'expired' : warn ? 'warn' : 'ok'}
      className={clsx('inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${String(size)} ${String(size)}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={2} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={expired ? 'var(--signal)' : warn ? 'var(--warn)' : 'var(--accent-2)'}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - frac) }}
          transition={{ duration: 0.9, ease: 'linear' }}
          transform={`rotate(-90 ${String(size / 2)} ${String(size / 2)})`}
        />
      </svg>
    </span>
  );
}
