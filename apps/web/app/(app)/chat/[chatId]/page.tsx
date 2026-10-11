'use client';

import { Suspense, use } from 'react';

import { SignInGate } from '@/components/auth/SignInGate';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  const safe = /^[a-zA-Z0-9_-]{1,64}$/.test(chatId) ? chatId : null;
  if (!safe) return <p className="text-sm text-signal">Invalid chat id.</p>;
  return (
    <Suspense fallback={null}>
      <SignInGate what="this chat">
        <ChatWorkspace chatId={safe} />
      </SignInGate>
    </Suspense>
  );
}
