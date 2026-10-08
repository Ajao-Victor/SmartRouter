'use client';

import { motion } from 'motion/react';

import { fadeUp, floatLoop, revealItem, staggerWords, withReduced } from '@/lib/motion/variants';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

/**
 * Placeholder home on the shared motion library — replaced by the full landing in Task 10.
 */
const PITCH =
  'Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere.';

export default function HomePage() {
  const reduced = useReducedMotionSafe();
  const words = withReduced(revealItem, reduced);
  const rise = withReduced(fadeUp, reduced);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-8 px-4 py-16">
      <motion.p
        variants={rise}
        initial="hidden"
        animate="visible"
        className="num text-2xs tracking-label text-text-2 uppercase"
      >
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
        transition={{ delay: 1.2 }}
        className="glass num flex flex-wrap items-center gap-x-4 gap-y-2 rounded-pill px-5 py-3 text-sm text-text-1 shadow-glow-accent"
      >
        <motion.div
          variants={reduced ? undefined : floatLoop}
          animate="float"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          <span>10 providers</span>
          <span className="text-line-strong">·</span>
          <span>~40 models</span>
          <span className="text-line-strong">·</span>
          <span className="text-free">Free · Llama 3.1 8B always available</span>
        </motion.div>
      </motion.div>
    </main>
  );
}
