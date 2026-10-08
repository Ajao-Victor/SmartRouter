'use client';

import { X } from 'lucide-react';
import { motion } from 'motion/react';

import type { Suggestion } from '@/lib/api/types';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, withReduced } from '@/lib/motion/variants';

import { Button } from '@/components/ui/Button';

export interface SuggestionChipProps {
  suggestion: Suggestion;
  modelLabel: string;
  onApply: (modelId: string) => void;
  onDismiss: () => void;
}

/** PDF: "Suggest, never force" — a dismissible chip above the composer. */
export function SuggestionChip({ suggestion, modelLabel, onApply, onDismiss }: SuggestionChipProps) {
  const reduced = useReducedMotionSafe();
  return (
    <motion.div
      role="status"
      variants={withReduced(fadeUp, reduced)}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="glass shimmer-line flex flex-wrap items-center gap-2 rounded-pill py-1.5 pr-1.5 pl-4 text-sm text-text-0"
    >
      <span>
        This looks like <span className="text-accent-2">{suggestion.task_type}</span> — try{' '}
        <span className="font-medium">{modelLabel}</span>
        <span className="text-text-2"> ({suggestion.reason})</span>
      </span>
      <span className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            onApply(suggestion.model_id);
          }}
        >
          Switch
        </Button>
        <Button size="sm" variant="ghost" aria-label="Dismiss suggestion" onClick={onDismiss}>
          <X size={14} />
        </Button>
      </span>
    </motion.div>
  );
}
