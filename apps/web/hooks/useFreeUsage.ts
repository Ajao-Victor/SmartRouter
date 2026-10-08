'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';

/** Free-model usage today (`GET /api/free/usage`, proposed). PDF: 30 messages per user per day. */
export function useFreeUsage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.free.usage(),
    queryFn: ({ signal }) => api.free.usage(signal),
    staleTime: 15_000,
    enabled,
  });
}
