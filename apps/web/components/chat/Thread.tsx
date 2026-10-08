'use client';

import { useEffect, useRef, useState } from 'react';

import { ArrowDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import type { Message } from '@/lib/api/types';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeScale, withReduced } from '@/lib/motion/variants';

import { selectAnyStreaming, useStreamStore } from '@/stores/streamStore';

import { MessageBubble } from '@/components/chat/MessageBubble';
import { Button } from '@/components/ui/Button';

export interface ThreadProps {
  messages: Message[];
  jobs?: Record<string, { status: 'queued' | 'running' | 'done' | 'failed'; result_ref: string | null; error: string | null }>;
  onRerunFree?: (messageId: string) => void;
  /** Extra content rendered below the last message (e.g. retry notices, TopUpBar). */
  children?: React.ReactNode;
}

const WINDOW = 60;

/** The conversation: auto-follows while streaming unless the user scrolled up ("Jump to latest"). */
export function Thread({ messages, jobs = {}, onRerunFree, children }: ThreadProps) {
  const reduced = useReducedMotionSafe();
  const endRef = useRef<HTMLDivElement | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pinned, setPinned] = useState(true);
  const streaming = useStreamStore(selectAnyStreaming);
  const visible = showAll || messages.length <= WINDOW ? messages : messages.slice(-WINDOW);

  useEffect(() => {
    const onScroll = () => {
      const gap = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      setPinned(gap < 160);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (pinned) endRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'end' });
  }, [lastId, streaming, pinned, reduced]);

  return (
    <div className="space-y-4" aria-label="Conversation">
      {!showAll && messages.length > WINDOW && (
        <div className="text-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowAll(true);
            }}
          >
            Show {String(messages.length - WINDOW)} earlier messages
          </Button>
        </div>
      )}
      {visible.map((m) => (
        <MessageBubble key={m.id} message={m} job={jobs[m.id] ?? null} {...(onRerunFree ? { onRerunFree } : {})} />
      ))}
      {children}
      <div ref={endRef} />
      <AnimatePresence>
        {!pinned && streaming && (
          <motion.div variants={withReduced(fadeScale, reduced)} initial="hidden" animate="visible" exit="exit" className="fixed bottom-36 left-1/2 z-content -translate-x-1/2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setPinned(true);
                endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              }}
            >
              <ArrowDown size={14} /> Jump to latest
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
