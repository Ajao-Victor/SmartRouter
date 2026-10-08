'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys, QUOTE_TTL_MS } from '@/lib/api/keys';
import type { QuoteInput, QuoteResponse, SliderPreset } from '@/lib/api/types';

export interface QuoteArgs extends QuoteInput {
  slider: SliderPreset;
}

function promptHash(prompt: string): string {
  let h = 0;
  for (let i = 0; i < prompt.length; i += 1) h = (h * 31 + prompt.charCodeAt(i)) | 0;
  return `h${String(Math.abs(h))}`;
}

/**
 * Classify + rank + quote for the next turn (`POST /api/chats/:id/quote`, proposed).
 * Results are cached by (chat, prompt hash, model, slider) and garbage-collected after the
 * PDF's 5-minute validity. A quote past `expires_at` must never be submitted — re-quote.
 */
export function useQuote(chatId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ prompt, slider, model_id, attachments }: QuoteArgs) => {
      if (!chatId) throw new Error('useQuote: no chat');
      return api.chats.quote(chatId, {
        prompt,
        slider,
        ...(model_id ? { model_id } : {}),
        ...(attachments ? { attachments } : {}),
      });
    },
    onSuccess: (data: QuoteResponse, vars) => {
      if (!chatId) return;
      qc.setQueryData(queryKeys.quote(chatId, promptHash(vars.prompt), vars.model_id ?? null, vars.slider), data, {
        updatedAt: Date.now(),
      });
      qc.setQueryDefaults(['quote'], { gcTime: QUOTE_TTL_MS, staleTime: 0 });
    },
  });
}

export function isQuoteExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}
