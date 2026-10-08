'use client';

import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

import { springs } from '@/lib/motion/springs';

import { useUiStore } from '@/stores/uiStore';

export interface ModelPillProps {
  label: string | null;
  isFree?: boolean;
  /** Auto = top pick runs (PDF). */
  auto?: boolean;
  className?: string;
}

/** Current-model pill in the composer. Tap → ModelPicker. Honest labels: "via MPP" / "Free · Llama 3.1 8B". */
export function ModelPill({ label, isFree = false, auto = false, className }: ModelPillProps) {
  const openDialog = useUiStore((s) => s.openDialog);
  const text = label ?? (auto ? 'Auto · top pick' : 'Choose model');
  return (
    <motion.button
      type="button"
      layoutId="model-pill"
      transition={springs.snappy}
      onClick={() => {
        openDialog('modelPicker');
      }}
      aria-label={`Model: ${text}`}
      className={clsx(
        'glass hit-44 inline-flex max-w-[60vw] items-center gap-1.5 rounded-pill px-3 text-xs font-medium transition-[box-shadow,color] sm:max-w-xs',
        isFree ? 'text-free hocus:shadow-glow-free' : 'text-text-0 hocus:shadow-glow-accent',
        className,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', isFree ? 'bg-free' : 'bg-accent-2')} aria-hidden="true" />
      <span className="truncate">{text}</span>
      {label && !isFree && <span className="text-text-2">· via MPP</span>}
      <ChevronDown size={14} className="shrink-0 text-text-2" aria-hidden="true" />
    </motion.button>
  );
}
