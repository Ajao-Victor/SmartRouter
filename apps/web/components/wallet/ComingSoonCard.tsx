'use client';

import { useState } from 'react';

import { motion } from 'motion/react';

import type { WaitlistInput } from '@/lib/api/types';
import { springs } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

import { HoloCard } from '@/components/fx/HoloCard';
import { WaitlistForm } from '@/components/wallet/WaitlistForm';

export interface ComingSoonCardProps {
  interest: WaitlistInput['interest'];
}

const COPY: Record<WaitlistInput['interest'], { title: string; body: string }> = {
  naira: { title: 'Naira via Paystack', body: 'Top up in naira with a licensed conversion partner. Coming soon.' },
  credits: { title: 'MPP Credits', body: 'Closed-loop credits after Tempo’s T12 upgrade (mainnet Oct 13). Coming soon.' },
};

/** Dashed, breathing card (PDF: not in the launch build) that flips to the waitlist form. */
export function ComingSoonCard({ interest }: ComingSoonCardProps) {
  const reduced = useReducedMotionSafe();
  const [flipped, setFlipped] = useState(false);
  const c = COPY[interest];
  return (
    <div className="perspective-900">
      <motion.div
        className="preserve-3d relative"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduced ? { duration: 0 } : springs.glide}
      >
        <HoloCard
          dashed
          interactive={!flipped}
          tilt={3}
          className="p-4 [backface-visibility:hidden]"
          role="button"
          tabIndex={flipped ? -1 : 0}
          aria-label={`${c.title} — join the waitlist`}
          aria-hidden={flipped}
          onClick={() => {
            setFlipped(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFlipped(true);
            }
          }}
        >
          <p className="font-display text-base text-text-0">{c.title}</p>
          <p className="mt-1 text-xs text-text-1">{c.body}</p>
          <p className="num mt-3 text-2xs tracking-wider-ui text-accent-2 uppercase">Join the waitlist →</p>
        </HoloCard>
        <div
          className="glass absolute inset-0 rounded-lg p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-hidden={!flipped}
        >
          {flipped && (
            <WaitlistForm
              interest={interest}
              onDone={() => {
                window.setTimeout(() => {
                  setFlipped(false);
                }, 1500);
              }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
