'use client';

import { useEffect, useRef, useState } from 'react';

import { clsx } from 'clsx';
import { motion } from 'motion/react';

import { Markdown } from '@/lib/markdown';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { tokenBatch, withReduced } from '@/lib/motion/variants';

import { selectEntry, useStreamStore } from '@/stores/streamStore';

export interface StreamTextProps {
  messageId: string;
  /** Final content when there is no live stream entry (history). */
  content: string;
  className?: string;
}

/**
 * Token renderer: plain text with a caret while streaming (batches flushed per animation frame,
 * each batch micro-animates in), then sanitised markdown once done.
 */
export function StreamText({ messageId, content, className }: StreamTextProps) {
  const reduced = useReducedMotionSafe();
  const entry = useStreamStore(selectEntry(messageId));
  const [shown, setShown] = useState<{ head: string; tail: string }>({ head: '', tail: '' });
  const raf = useRef<number | null>(null);
  const lastLen = useRef(0);

  const live = entry && (entry.status === 'streaming' || entry.status === 'retrying');
  const tokens = entry?.tokens;

  useEffect(() => {
    if (!tokens) return;
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      const all = tokens.join('');
      const head = all.slice(0, lastLen.current);
      const tail = all.slice(lastLen.current);
      lastLen.current = all.length;
      setShown({ head, tail });
    });
  }, [tokens]);

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  useEffect(() => {
    if (entry?.status === 'retrying') {
      lastLen.current = 0;
      setShown({ head: '', tail: '' });
    }
  }, [entry?.status]);

  if (!live) {
    const text = entry && entry.tokens.length > 0 ? entry.tokens.join('') : content;
    return <Markdown className={className}>{text}</Markdown>;
  }

  return (
    <p className={clsx('caret-stream max-w-[68ch] text-base leading-6 whitespace-pre-wrap text-text-0', className)} aria-live="polite" aria-busy="true">
      {shown.head}
      {shown.tail && (
        <motion.span key={lastLen.current} variants={withReduced(tokenBatch, reduced)} initial="hidden" animate="visible" className="inline">
          {shown.tail}
        </motion.span>
      )}
    </p>
  );
}
