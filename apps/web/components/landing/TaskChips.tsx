'use client';

import { useRouter } from 'next/navigation';

import { motion } from 'motion/react';

import { TASK_TYPES, type TaskType } from '@/lib/api/types';
import { env } from '@/lib/env';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, stagger, withReduced } from '@/lib/motion/variants';

import { burstAt, useParticleBurst } from '@/components/fx/ParticleBurst';
import { Chip } from '@/components/ui/Chip';

const LABEL: Record<TaskType, string> = {
  chat: 'Chat',
  writing: 'Writing',
  coding: 'Coding',
  research: 'Research',
  translation: 'Translation',
  image: 'Image',
  music: 'Music',
};

/** PDF task categories. Click → burst + New chat with the category preselected. */
export function TaskChips() {
  const router = useRouter();
  const burst = useParticleBurst();
  const reduced = useReducedMotionSafe();
  return (
    <motion.div
      variants={withReduced(stagger({ each: 0.05, delay: 1.2 }), reduced)}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap gap-2"
      aria-label="Task categories"
    >
      {TASK_TYPES.filter((t) => t !== 'music' || env.flagMusic).map((t) => (
        <motion.div key={t} variants={withReduced(fadeUp, reduced)}>
          <Chip
            tone={t === 'research' ? 'teal' : 'accent'}
            onClick={(e) => {
              burst(burstAt(e, '#7C5CFF', 36));
              router.push(`/chat?category=${t}`);
            }}
          >
            {LABEL[t]}
          </Chip>
        </motion.div>
      ))}
    </motion.div>
  );
}
