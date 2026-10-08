'use client';

import { useState } from 'react';

import { clsx } from 'clsx';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { motion } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { pop, withReduced } from '@/lib/motion/variants';

import { useFeedback } from '@/hooks/useFeedback';
import { toast } from '@/stores/toastStore';


import { burstAt, useParticleBurst } from '@/components/fx/ParticleBurst';

export function ThumbsFeedback({ messageId }: { messageId: string }) {
  const reduced = useReducedMotionSafe();
  const burst = useParticleBurst();
  const feedback = useFeedback();
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

  const send = (v: 'up' | 'down', e: React.MouseEvent) => {
    setVote(v);
    if (v === 'up') burst(burstAt(e, '#19E6C1', 6));
    feedback.mutate(
      { message_id: messageId, vote: v },
      {
        onError: () => {
          toast.warn('Could not save your feedback');
        },
      },
    );
  };

  return (
    <span className="inline-flex items-center gap-1" aria-label="Rate this reply">
      {(['up', 'down'] as const).map((v) => (
        <motion.button
          key={v}
          type="button"
          aria-label={v === 'up' ? 'Thumbs up' : 'Thumbs down'}
          aria-pressed={vote === v}
          variants={withReduced(pop, reduced)}
          animate={vote === v ? 'active' : 'idle'}
          onClick={(e) => {
            send(v, e);
          }}
          className={clsx(
            'hit-44 -m-1 flex items-center justify-center rounded-pill text-text-2 transition-colors hocus:text-text-0',
            vote === v && (v === 'up' ? 'text-accent-2' : 'text-signal'),
          )}
        >
          {v === 'up' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}
        </motion.button>
      ))}
    </span>
  );
}
