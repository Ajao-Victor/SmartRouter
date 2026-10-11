'use client';

import Link from 'next/link';

import type { Chat } from '@/lib/api/types';

import { TASK_LABEL } from '@/components/chat/NewChat';
import { PriceTag } from '@/components/ui/PriceTag';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ChatListProps {
  chats: Chat[] | undefined;
  loading?: boolean;
}

function when(iso: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const h = Math.round(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${String(h)} h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${String(d)} d ago` : new Date(t).toLocaleDateString();
}

/** Recent chats (`GET /chats`): title, category, when, spend. */
export function ChatList({ chats, loading = false }: ChatListProps) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (!chats || chats.length === 0) {
    return <p className="text-sm text-text-2">No chats yet.</p>;
  }

  return (
    <ul className="divide-y divide-line" aria-label="Recent chats">
      {chats.map((chat) => (
        <li key={chat.id}>
          <Link href={`/chat/${chat.id}`} className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hocus:bg-bg-1">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base text-text-0">{chat.title ?? 'Untitled chat'}</span>
              <span className="mt-0.5 block text-xs text-text-2">
                {TASK_LABEL[chat.taskType]}
                {chat.messageCount !== null && ` · ${String(chat.messageCount)} messages`}
                {chat.updatedAt && ` · ${when(chat.updatedAt)}`}
              </span>
            </span>
            <PriceTag micro={chat.spentUsd} size="sm" freeLabel tone="neutral" className="shrink-0 text-text-1" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
