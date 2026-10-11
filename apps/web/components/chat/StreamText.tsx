'use client';

import { lazy, Suspense } from 'react';

import { clsx } from 'clsx';

import { selectEntry, useStreamStore } from '@/stores/streamStore';

/** Markdown (react-markdown + GFM + sanitize) is lazy so it stays out of the chat route's first load. */
const Markdown = lazy(() => import('@/lib/markdown').then((m) => ({ default: m.Markdown })));

export interface StreamTextProps {
  messageId: string;
  /** Final content when there is no live stream entry (history). */
  content: string;
  className?: string;
}

const plain = 'max-w-[68ch] text-base leading-7 whitespace-pre-wrap text-text-0';

/**
 * Answer text: plain text with a caret while `delta` events arrive, sanitised markdown once
 * `done` (plain text stands in until the markdown renderer has loaded). No per-token animation —
 * the text simply grows, which reads best at speed.
 */
export function StreamText({ messageId, content, className }: StreamTextProps) {
  const entry = useStreamStore(selectEntry(messageId));
  const live = entry !== undefined && (entry.status === 'streaming' || entry.status === 'fallback');

  if (!live) {
    const text = entry && entry.text.length > 0 ? entry.text : content;
    if (!text) return null;
    return (
      <div className={clsx('prose-chat', className)}>
        <Suspense fallback={<p className={plain}>{text}</p>}>
          <Markdown>{text}</Markdown>
        </Suspense>
      </div>
    );
  }

  return (
    <p className={clsx('caret-stream', plain, className)} aria-live="polite" aria-busy="true">
      {entry.text}
    </p>
  );
}
