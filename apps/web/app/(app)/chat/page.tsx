'use client';

import { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

import { taskTypeSchema } from '@/lib/api/types';

import { useChats } from '@/hooks/useChats';

import { ChatList } from '@/components/chat/ChatList';
import { NewChat } from '@/components/chat/NewChat';

function NewChatScreen() {
  const params = useSearchParams();
  const parsed = taskTypeSchema.safeParse(params.get('category'));
  const chats = useChats();
  return (
    <div className="space-y-10">
      <NewChat initialCategory={parsed.success ? parsed.data : null} />
      <section className="space-y-3">
        <p className="num text-2xs tracking-label text-text-2 uppercase">Recent</p>
        <ChatList chats={chats.data} loading={chats.isPending} />
      </section>
    </div>
  );
}

export default function NewChatPage() {
  return (
    <Suspense fallback={null}>
      <NewChatScreen />
    </Suspense>
  );
}
