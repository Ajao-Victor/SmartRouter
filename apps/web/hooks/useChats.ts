'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { Chat, CreateChatInput } from '@/lib/api/types';

/** Chat list (`GET /api/chats`, proposed). */
export function useChats() {
  return useQuery({
    queryKey: queryKeys.chats(),
    queryFn: ({ signal }) => api.chats.list(signal),
  });
}

/** Create a chat from a category or a first prompt (PDF: a description is classified and quoted as the first prompt). */
export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChatInput) => api.chats.create(input),
    onSuccess: (chat: Chat) => {
      qc.setQueryData<Chat[]>(queryKeys.chats(), (prev) => [chat, ...(prev ?? [])]);
      void qc.invalidateQueries({ queryKey: queryKeys.chats() });
    },
  });
}
