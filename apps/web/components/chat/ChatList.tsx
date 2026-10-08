'use client';

import { useRouter } from 'next/navigation';

import { motion } from 'motion/react';

import type { Chat } from '@/lib/api/types';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, stagger, withReduced } from '@/lib/motion/variants';

import { GlitchText } from '@/components/fx/GlitchText';
import { HoloCard } from '@/components/fx/HoloCard';
import { Chip } from '@/components/ui/Chip';
import { PriceTag } from '@/components/ui/PriceTag';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ChatListProps {
  chats: Chat[] | undefined;
  loading?: boolean;
}

/** Recent chats as tilting HoloCard rows: title glitches in, task chip, spend, message count. */
export function ChatList({ chats, loading = false }: ChatListProps) {
  const router = useRouter();
  const reduced = useReducedMotionSafe();

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (!chats || chats.length === 0) {
    return <p className="text-sm text-text-2">No chats yet. Pick a category or describe a task above.</p>;
  }

  return (
    <motion.ul
      variants={withReduced(stagger({ each: 0.06 }), reduced)}
      initial="hidden"
      animate="visible"
      className="space-y-3"
      aria-label="Recent chats"
    >
      {chats.map((chat) => (
        <motion.li key={chat.id} variants={withReduced(fadeUp, reduced)}>
          <HoloCard
            tilt={3}
            className="p-4"
            role="link"
            tabIndex={0}
            aria-label={chat.title ?? 'Untitled chat'}
            onClick={() => {
              router.push(`/chat/${chat.id}`);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') router.push(`/chat/${chat.id}`);
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base text-text-0">
                  {chat.title ? <GlitchText text={chat.title} /> : <span className="text-text-2">Untitled chat</span>}
                </p>
                <p className="num mt-1 text-2xs tracking-wider-ui text-text-2 uppercase">
                  {String(chat.message_count)} messages
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Chip tone="neutral" className="pointer-events-none h-7 px-2.5 text-xs" tabIndex={-1}>
                  {chat.task_type}
                </Chip>
                <PriceTag micro={chat.spent} size="sm" freeLabel />
              </div>
            </div>
          </HoloCard>
        </motion.li>
      ))}
    </motion.ul>
  );
}
