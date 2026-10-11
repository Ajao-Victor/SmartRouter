'use client';

import dynamic from 'next/dynamic';

import { clsx } from 'clsx';

import { selectEntry, useStreamStore } from '@/stores/streamStore';

/** Markdown (react-markdown + GFM + sanitize) is lazy so it stays out of the chat route's first load. */
const Markdown = dynamic(() => import('@/lib/markdown').then((m) => m.Markdown), {
  ssr: false,
  loading: () => null,
});

export interface StreamTextProps {
  messageId: string;
  /** Final content when there is no live stream entry (history). */
  content: string;
  className?: string;
}

/**
 * Answer text: plain text with a caret while `delta` events arrive, sanitised markdown once
 * `done`. No per-token animation — the text simply grows, which reads best at speed.
 */
export function StreamText({ messageId, content, className }: StreamTextProps) {
  const entry = useStreamStore(selectEntry(messageId));
  const live = entry !== undefined && (entry.status === 'streaming' || entry.status === 'fallback');

  if (!live) {
    const text = entry && entry.text.length > 0 ? entry.text : content;
    if (!text) return null;
    return (
      <div className={clsx('prose-chat', className)}>
        <Markdown>{text}</Markdown>
      </div>
    );
  }

  return (
    <p className={clsx('caret-stream max-w-[68ch] text-base leading-7 whitespace-pre-wrap text-text-0', className)} aria-live="polite" aria-busy="true">
      {entry.text}
    </p>
  );
}
