'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { Chat, ChatList, CreateChatInput, CreateChatResponse } from '@/lib/api/types';

/** Recent chats (`GET /chats?cursor=`; first page). */
export function useChats() {
  return useQuery({
    queryKey: queryKeys.chats(),
    queryFn: ({ signal }) => api.chats.list(null, signal),
  });
}

/** `POST /chats { taskType?, description?, slider? }` → `chatId` + options for the first turn. */
export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChatInput) => api.chats.create(input),
    onSuccess: (res: CreateChatResponse, input) => {
      const chat: Chat = {
        id: res.chatId,
        title: res.title ?? (input.description ? input.description.slice(0, 48) : null),
        taskType: res.taskType ?? input.taskType ?? 'chat',
        slider: input.slider ?? null,
        currentModelId: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        messageCount: 0,
        spentUsd: 0 as Chat['spentUsd'],
      };
      qc.setQueryData<ChatList>(queryKeys.chats(), (prev) => ({ chats: [chat, ...(prev?.chats ?? [])], nextCursor: prev?.nextCursor ?? null }));
      void qc.invalidateQueries({ queryKey: queryKeys.chats() });
    },
  });
}

/** Rename (`PATCH /chats/:id { title }`). */
export function useRenameChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) => api.chats.update(chatId, { title }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.chats() });
    },
  });
}

/** Archive (`DELETE /chats/:id`). */
export function useArchiveChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => api.chats.remove(chatId),
    onSuccess: (_res, chatId) => {
      qc.setQueryData<ChatList>(queryKeys.chats(), (prev) => (prev ? { ...prev, chats: prev.chats.filter((c) => c.id !== chatId) } : prev));
      qc.removeQueries({ queryKey: queryKeys.chat(chatId) });
    },
  });
}
