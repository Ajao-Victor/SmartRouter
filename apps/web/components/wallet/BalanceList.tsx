'use client';

import { useEffect, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import { formatUsd, type MicroUsd } from '@/lib/money';

import { HoloCard } from '@/components/fx/HoloCard';
import { NumberTicker } from '@/components/fx/NumberTicker';
import { Skeleton } from '@/components/ui/Skeleton';

export interface TokenBalance {
  /** e.g. USDC.e, OUSD, pathUSD, USDT0 (PDF). */
  token: string;
  /** Micro units of a USD-pegged stablecoin for display. */
  micro: MicroUsd;
}

export interface BalanceListProps {
  balances: TokenBalance[] | undefined;
  loading?: boolean;
}

/** One tilting card per token; a teal "deposit splash" ripples when a balance increases. */
export function BalanceList({ balances, loading = false }: BalanceListProps) {
  const prev = useRef<Map<string, number>>(new Map());
  const [splash, setSplash] = useState<string | null>(null);

  useEffect(() => {
    if (!balances) return;
    for (const b of balances) {
      const before = prev.current.get(b.token);
      if (before !== undefined && b.micro > before) setSplash(b.token);
      prev.current.set(b.token, b.micro);
    }
  }, [balances]);

  useEffect(() => {
    if (!splash) return;
    const t = window.setTimeout(() => {
      setSplash(null);
    }, 900);
    return () => {
      window.clearTimeout(t);
    };
  }, [splash]);

  if (loading || !balances) {
    return (
      <div className="grid grid-cols-2 gap-3" aria-busy="true">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3" aria-label="Balances">
      {balances.map((b) => (
        <li key={b.token}>
          <HoloCard tone={b.token === 'USDC.e' ? 'teal' : 'accent'} tilt={4} className="relative overflow-hidden p-3">
            <AnimatePresence>
              {splash === b.token && (
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 m-auto h-10 w-10 rounded-full bg-accent-2/60"
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: 6, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>
            <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">{b.token}</p>
            <p className="num mt-1 text-xl text-text-0">
              <NumberTicker value={b.micro / 1_000_000} format={(n) => formatUsd(Math.round(n * 1_000_000) as MicroUsd, { max: 2 })} />
            </p>
          </HoloCard>
        </li>
      ))}
    </ul>
  );
}
