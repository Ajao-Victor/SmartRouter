'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { ChatWithMessages, Message } from '@/lib/api/types';

/** One chat with its messages (`GET /api/chats/:id`, proposed). */
export function useChat(chatId: string | null) {
  return useQuery({
    queryKey: queryKeys.chat(chatId ?? ''),
    queryFn: ({ signal }) => api.chats.get(chatId ?? '', signal),
    enabled: chatId !== null,
  });
}

/** Optimistic helpers used by the run flow (Task 21). */
export function useChatCache(chatId: string) {
  const qc = useQueryClient();
  const key = queryKeys.chat(chatId);
  return {
    append: (message: Message) => {
      qc.setQueryData<ChatWithMessages>(key, (prev) =>
        prev ? { ...prev, messages: [...prev.messages, message], message_count: prev.message_count + 1 } : prev,
      );
    },
    update: (messageId: string, patch: Partial<Message>) => {
      qc.setQueryData<ChatWithMessages>(key, (prev) =>
        prev ? { ...prev, messages: prev.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)) } : prev,
      );
    },
    remove: (messageId: string) => {
      qc.setQueryData<ChatWithMessages>(key, (prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== messageId), message_count: Math.max(0, prev.message_count - 1) } : prev,
      );
    },
    setCurrentModel: (modelId: string) => {
      qc.setQueryData<ChatWithMessages>(key, (prev) => (prev ? { ...prev, current_model_id: modelId } : prev));
    },
    invalidate: () => qc.invalidateQueries({ queryKey: key }),
  };
}

/** Build an optimistic message. */
export function optimisticMessage(chatId: string, seq: number, over: Partial<Message> & Pick<Message, 'role' | 'content' | 'status'>): Message {
  return {
    id: `local_${String(Date.now())}_${String(seq)}`,
    chat_id: chatId,
    seq,
    attachments: [],
    model_id: null,
    request_id: null,
    result_ref: null,
    tokens: null,
    created_at: new Date().toISOString(),
    ...over,
  };
}
