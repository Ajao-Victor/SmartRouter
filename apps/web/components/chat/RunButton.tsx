'use client';

import { forwardRef } from 'react';

import type { MicroUsd } from '@/lib/money';

import { burstAt, useParticleBurst } from '@/components/fx/ParticleBurst';
import { QuoteRing } from '@/components/recommend/QuoteRing';
import { MagneticButton, type MagneticButtonProps } from '@/components/ui/MagneticButton';
import { PriceTag } from '@/components/ui/PriceTag';

export interface RunButtonProps extends Omit<MagneticButtonProps, 'children' | 'onClick'> {
  /** Quote price and expiry when a quote exists; null → "Get quote". */
  quote: { price: MicroUsd; expiresAt: string; isFree: boolean } | null;
  onGetQuote: () => void;
  onRun: () => void;
  onQuoteExpired?: () => void;
}

/**
 * The money button (design.md §4.3): price inside, countdown ring around it, particle burst
 * on tap. Parent draws the GlowTrail (it owns the target refs).
 */
export const RunButton = forwardRef<HTMLButtonElement, RunButtonProps>(function RunButton(
  { quote, onGetQuote, onRun, onQuoteExpired, ...rest },
  ref,
) {
  const burst = useParticleBurst();
  if (!quote) {
    return (
      <MagneticButton ref={ref} variant="secondary" onClick={onGetQuote} {...rest}>
        Get quote
      </MagneticButton>
    );
  }
  return (
    <MagneticButton
      ref={ref}
      variant={quote.isFree ? 'free' : 'primary'}
      onClick={(e) => {
        burst(burstAt(e, quote.isFree ? '#9BE15D' : '#19E6C1', 72));
        onRun();
      }}
      {...rest}
    >
      <span>Run</span>
      <span aria-hidden="true">·</span>
      <PriceTag micro={quote.price} size="md" tone={quote.isFree ? 'free' : 'neutral'} freeLabel />
      {!quote.isFree && <QuoteRing expiresAt={quote.expiresAt} {...(onQuoteExpired ? { onExpired: onQuoteExpired } : {})} />}
    </MagneticButton>
  );
});
