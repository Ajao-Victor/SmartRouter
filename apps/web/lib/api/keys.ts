import type { SliderPreset, TaskType } from '@/lib/api/types';

/**
 * Single source of TanStack Query keys (rules.md §4.2).
 * Components never write key arrays inline.
 */
export const queryKeys = {
  me: () => ['me'] as const,
  wallet: {
    balance: () => ['wallet', 'balance'] as const,
  },
  session: {
    current: () => ['session', 'current'] as const,
  },
  models: (task?: TaskType) => (task ? (['models', task] as const) : (['models'] as const)),
  chats: () => ['chats'] as const,
  chat: (chatId: string) => ['chat', chatId] as const,
  /** Quote cache is GC'd after 5 minutes (PDF validity). */
  quote: (chatId: string, promptHash: string, modelId: string | null, slider: SliderPreset) =>
    ['quote', chatId, promptHash, modelId ?? 'auto', slider] as const,
  job: (jobId: string) => ['job', jobId] as const,
  request: (requestId: string) => ['request', requestId] as const,
  free: {
    usage: () => ['free', 'usage'] as const,
  },
} as const;

/** Quote validity window in ms (PDF: 5 minutes). */
export const QUOTE_TTL_MS = 5 * 60_000;
