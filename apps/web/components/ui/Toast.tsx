'use client';

import { useEffect } from 'react';

import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { toast as toastVariants, withReduced } from '@/lib/motion/variants';

import { useToastStore, type ToastItem } from '@/stores/toastStore';

const toneClass: Record<ToastItem['tone'], string> = {
  info: 'shadow-glow-accent',
  success: 'shadow-glow-teal',
  warn: 'shadow-glow-warn',
  error: 'shadow-glow-signal',
};

const toneDot: Record<ToastItem['tone'], string> = {
  info: 'bg-accent',
  success: 'bg-accent-2',
  warn: 'bg-warn',
  error: 'bg-signal',
};

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    if (item.duration === 0) return;
    const t = window.setTimeout(() => {
      dismiss(item.id);
    }, item.duration);
    return () => {
      window.clearTimeout(t);
    };
  }, [item.id, item.duration, dismiss]);

  return (
    <motion.div
      layout={!reduced}
      role={item.tone === 'error' ? 'alert' : 'status'}
      variants={withReduced(toastVariants, reduced)}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={clsx(
        'glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg px-4 py-3',
        toneClass[item.tone],
      )}
    >
      <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', toneDot[item.tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-0">{item.title}</p>
        {item.description && <p className="mt-0.5 text-xs text-text-1">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => {
          dismiss(item.id);
        }}
        aria-label="Dismiss"
        className="hit-44 -m-2 flex items-center justify-center rounded-pill text-text-2 hocus:text-text-0"
      >
        ×
      </button>
    </motion.div>
  );
}

/** Toast host: top-centre on mobile, bottom-right on desktop (UI_UX_Brief §6). z-toast (50). */
export function Toaster() {
  const items = useToastStore((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-toast flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:top-auto lg:right-6 lg:bottom-6 lg:items-end">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
