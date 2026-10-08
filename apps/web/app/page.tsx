'use client';

import { motion } from 'motion/react';

/**
 * Task 1 placeholder, now on the Task 3 token/utility layer — replaced by the full landing in Task 10.
 */
const PITCH =
  'Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere.';

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
        className="num text-2xs tracking-label text-text-2 uppercase"
      >
        AI model marketplace · pay per use on Tempo via MPP
      </motion.p>

      <motion.h1
        variants={container}
        initial="hidden"
        animate="visible"
        className="font-display text-display-sm font-semibold text-text-0 md:text-display-lg"
      >
        {PITCH.split(' ').map((w, i) => (
          <motion.span key={`${w}-${String(i)}`} variants={word} className="inline-block">
            {i < 2 ? <span className="text-beam">{w}</span> : w}&nbsp;
          </motion.span>
        ))}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="glass num motion-ok:animate-float flex flex-wrap items-center gap-x-4 gap-y-2 rounded-pill px-5 py-3 text-sm text-text-1 shadow-glow-accent"
      >
        <span>10 providers</span>
        <span className="text-line-strong">·</span>
        <span>~40 models</span>
        <span className="text-line-strong">·</span>
        <span className="text-free">Free · Llama 3.1 8B always available</span>
      </motion.div>
    </main>
  );
}
