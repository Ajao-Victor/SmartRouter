import { clsx } from 'clsx';

import { formatUsd, type MicroUsd } from '@/lib/money';

export interface PriceTagProps {
  micro: MicroUsd;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** price = teal (money), free = green, neutral = text colour, signal = pink. */
  tone?: 'price' | 'free' | 'neutral' | 'signal';
  /** Show "Free" instead of $0.00 when the amount is zero. */
  freeLabel?: boolean;
  className?: string;
}

const sizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
  xl: 'text-3xl',
} as const;

const tones = {
  price: 'text-price',
  free: 'text-free',
  neutral: 'text-text-0',
  signal: 'text-signal',
} as const;

/** Money display: mono, tabular. Prices arrive already rounded up to $0.0001 by the API (PDF). */
export function PriceTag({ micro, size = 'md', tone = 'price', freeLabel = false, className }: PriceTagProps) {
  if (freeLabel && micro === 0) {
    return <span className={clsx('num font-medium', sizes[size], tones.free, className)}>Free</span>;
  }
  return <span className={clsx('num font-medium', sizes[size], tones[tone], className)}>{formatUsd(micro)}</span>;
}
