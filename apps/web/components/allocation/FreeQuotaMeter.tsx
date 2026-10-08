'use client';

import { clsx } from 'clsx';

import { FREE_MESSAGES_PER_DAY } from '@/lib/api/types';

export interface FreeQuotaMeterProps {
  messages: number;
  limit?: number;
  className?: string;
}

/** "Free: 12/30 today" with a segmented bar; disabled styling at the cap (PDF: 30/day). */
export function FreeQuotaMeter({ messages, limit = FREE_MESSAGES_PER_DAY, className }: FreeQuotaMeterProps) {
  const used = Math.min(limit, Math.max(0, messages));
  const exhausted = used >= limit;
  const segments = 10;
  const filled = Math.round((used / limit) * segments);
  return (
    <div className={clsx('space-y-1', className)} role="meter" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label="Free messages used today">
      <p className={clsx('num text-2xs tracking-wider-ui uppercase', exhausted ? 'text-signal' : 'text-free')}>
        Free: {used}/{limit} today{exhausted && ' · limit reached'}
      </p>
      <div className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: segments }).map((_, i) => (
          <span key={String(i)} className={clsx('h-1 flex-1 rounded-pill', i < filled ? (exhausted ? 'bg-signal' : 'bg-free') : 'bg-bg-3')} />
        ))}
      </div>
    </div>
  );
}
