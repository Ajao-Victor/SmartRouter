'use client';

import { useState } from 'react';

import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'motion/react';

import type { Message } from '@/lib/api/types';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { collapseLoser, wipeLeft, wipeRight, withReduced } from '@/lib/motion/variants';

import { MessageBubble } from '@/components/chat/MessageBubble';
import { burstAt, useParticleBurst } from '@/components/fx/ParticleBurst';
import { MagneticButton } from '@/components/ui/MagneticButton';

export interface CompareSplitProps {
  left: Message;
  right: Message;
  /** Picking is enabled once both streams are done. */
  canPick: boolean;
  onPick: (side: 'left' | 'right') => void;
}

/** PDF Compare mode: two models run in parallel, side by side; the pick feeds the engine. */
export function CompareSplit({ left, right, canPick, onPick }: CompareSplitProps) {
  const reduced = useReducedMotionSafe();
  const burst = useParticleBurst();
  const [picked, setPicked] = useState<'left' | 'right' | null>(null);

  const pick = (side: 'left' | 'right', e: React.MouseEvent) => {
    setPicked(side);
    burst(burstAt(e, side === 'left' ? '#7C5CFF' : '#19E6C1', 80));
    onPick(side);
  };

  return (
    <div className="grid gap-3 md:grid-cols-2" aria-label="Compare two models">
      {(['left', 'right'] as const).map((side) => {
        const msg = side === 'left' ? left : right;
        const loser = picked !== null && picked !== side;
        return (
          <AnimatePresence key={side}>
            {!loser && (
              <motion.div
                variants={withReduced(side === 'left' ? wipeLeft : wipeRight, reduced)}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={clsx('space-y-3', picked === side && 'md:col-span-2')}
              >
                <MessageBubble message={msg} />
                {picked === null && (
                  <MagneticButton
                    size="sm"
                    variant={side === 'left' ? 'primary' : 'secondary'}
                    disabled={!canPick}
                    onClick={(e) => {
                      pick(side, e);
                    }}
                  >
                    Pick this one
                  </MagneticButton>
                )}
              </motion.div>
            )}
            {loser && (
              <motion.div key={`${side}-loser`} variants={withReduced(collapseLoser, reduced)} initial="visible" animate="collapsed" className="hidden md:block" aria-hidden="true" />
            )}
          </AnimatePresence>
        );
      })}
    </div>
  );
}
