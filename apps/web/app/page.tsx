'use client';

import { motion } from 'motion/react';

/**
 * Task 1 placeholder — replaced by the full landing in Task 10.
 * Already on-brand: dark field, beam-gradient pitch, staggered reveal.
 */
const PITCH = 'Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere.';

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const word = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 170, damping: 26 },
  },
} as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-8 px-4 py-16">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="num text-xs uppercase tracking-[0.3em] text-text-2"
      >
        AI model marketplace · pay per use on Tempo via MPP
      </motion.p>

      <motion.h1
        variants={container}
        initial="hidden"
        animate="visible"
        className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-text-0 md:text-6xl"
      >
        {PITCH.split(' ').map((w, i) => (
          <motion.span key={`${w}-${String(i)}`} variants={word} className="inline-block">
            {i < 2 ? <span className="text-beam">{w}</span> : w}&nbsp;
          </motion.span>
        ))}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="num flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-1"
      >
        <span>10 providers</span>
        <span className="text-line">·</span>
        <span>~40 models</span>
        <span className="text-line">·</span>
        <span className="text-free">Free · Llama 3.1 8B always available</span>
      </motion.div>
    </main>
  );
}
