'use client';

import { Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import type { TaskType } from '@/lib/api/types';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, withReduced } from '@/lib/motion/variants';

export interface ThreadNotesProps {
  /** The chat's task type. */
  chatTask: TaskType;
  /** Task type of the currently selected model's turn (from the quote classification or model). */
  turnTask: TaskType | null;
  /** Present once the free model has folded older turns (PDF: long chats). */
  hasSummary: boolean;
  /** Paid-model history cap reached (PDF: 8,000 tokens). */
  contextTokens?: number | null;
}

const HISTORY_CAP = 8000;

function Note({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotionSafe();
  return (
    <motion.p
      role="note"
      variants={withReduced(fadeUp, reduced)}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="glass inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs text-text-1"
    >
      <Info size={12} className="text-accent-2" aria-hidden="true" />
      {children}
    </motion.p>
  );
}

/**
 * PDF chat rules surfaced as info notes: image/music turns inside a text chat send only the new
 * prompt plus a one-line summary; older turns are folded into a running summary; history sent to
 * paid models is capped at 8,000 tokens.
 */
export function ThreadNotes({ chatTask, turnTask, hasSummary, contextTokens = null }: ThreadNotesProps) {
  const textChat = chatTask !== 'image' && chatTask !== 'music';
  const mediaTurn = turnTask === 'image' || turnTask === 'music';
  return (
    <div className="flex flex-wrap gap-2" aria-label="Thread notes">
      <AnimatePresence>
        {textChat && mediaTurn && (
          <Note key="media">This {turnTask} turn sends only the new prompt plus a one-line summary of the thread.</Note>
        )}
        {hasSummary && <Note key="summary">Older turns were summarised by the free model to keep history under 8,000 tokens.</Note>}
        {contextTokens !== null && contextTokens >= HISTORY_CAP && !hasSummary && (
          <Note key="cap">History sent to paid models is capped at 8,000 tokens.</Note>
        )}
      </AnimatePresence>
    </div>
  );
}
