'use client';

import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import type { Option, Quote, RecommendInput } from '@/lib/api/types';

/**
 * PDF "A normal turn": `POST /chats/:id/quote { prompt, modelId? }` returns `quoteId`,
 * `priceUsd`, `free`, `expiresAt` (+ `suggestion`). The price goes on the Send button; a quote
 * past `expiresAt` is never submitted — re-quote silently, confirm only if the price changed.
 */
export function useQuote(chatId: string | null) {
  return useMutation({
    mutationFn: ({ prompt, modelId }: { prompt: string; modelId?: string | null }): Promise<Quote> => {
      if (!chatId) throw new Error('useQuote: no chat');
      return api.chats.quote(chatId, { prompt, ...(modelId ? { modelId } : {}) });
    },
  });
}

/** Options for a prompt (`POST /recommend`): 3 recommended models + the free option. */
export function useRecommend() {
  return useMutation({
    mutationFn: (input: RecommendInput): Promise<Option[]> => api.catalog.recommend(input).then((r) => r.options),
  });
}

export function isQuoteExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}
