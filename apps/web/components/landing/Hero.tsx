'use client';


import { motion } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, floatLoop, revealItem, staggerWords, withReduced } from '@/lib/motion/variants';

import { RouterOrb } from '@/components/fx/RouterOrb';
import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/ui/MagneticButton';

/** PDF pitch, verbatim. */
export const PITCH =
  'Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere.';

export interface HeroProps {
  onSignIn: () => void;
  signingIn?: boolean;
  /** Navigate to the app (`/chat`); the page owns the transition so the button can show pending. */
  onStart: () => void;
  starting?: boolean;
}

export function Hero({ onSignIn, signingIn = false, onStart, starting = false }: HeroProps) {
  const reduced = useReducedMotionSafe();
  const words = withReduced(revealItem, reduced);
  const rise = withReduced(fadeUp, reduced);

  return (
    <section className="relative grid items-center gap-10 py-12 md:grid-cols-[1.4fr_1fr] md:py-20">
      <div className="space-y-7">
        <motion.p variants={rise} initial="hidden" animate="visible" className="num text-2xs tracking-label text-text-2 uppercase">
          AI model marketplace · pay per use on Tempo via MPP
        </motion.p>
        <motion.h1
          variants={staggerWords}
          initial="hidden"
          animate="visible"
          className="font-display text-display-sm font-semibold text-text-0 md:text-display-lg"
        >
          {PITCH.split(' ').map((w, i) => (
            <motion.span key={`${w}-${String(i)}`} variants={words} className="inline-block">
              {i < 2 ? <span className="text-beam">{w}</span> : w}&nbsp;
            </motion.span>
          ))}
        </motion.h1>
        <motion.div
          variants={rise}
          initial="hidden"
          animate="visible"
          transition={{ delay: 1.1 }}
          className="flex flex-wrap items-center gap-3"
        >
          <MagneticButton size="lg" onClick={onStart} loading={starting}>
            Start a task
          </MagneticButton>
          <Button variant="secondary" size="lg" onClick={onSignIn} loading={signingIn}>
            Sign in with passkey
          </Button>
        </motion.div>
        <motion.p variants={rise} initial="hidden" animate="visible" transition={{ delay: 1.3 }} className="text-sm text-text-2">
          No subscriptions. No API keys. Fund once with any Tempo token; unused allocation returns to your wallet.
        </motion.p>
      </div>
      <motion.div
        className="mx-auto"
        {...(reduced ? {} : { variants: floatLoop, animate: 'float' })}
        aria-hidden="true"
      >
        <RouterOrb size={220} activity={0.25} />
      </motion.div>
    </section>
  );
}
