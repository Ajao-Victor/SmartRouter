'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';

const POLL_MS = 5_000;

/**
 * A run and what it charged (`GET /requests/:id`). Refunds appear here. Pending/running runs
 * are polled every 5 s (PDF `pending`) until `succeeded` or `failed`.
 */
export function useReceipt(requestId: string | null) {
  return useQuery({
    queryKey: queryKeys.request(requestId ?? ''),
    queryFn: ({ signal }) => api.requests.get(requestId ?? '', signal),
    enabled: requestId !== null,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'pending' || s === 'running' ? POLL_MS : false;
    },
  });
}

/** Activity list (`GET /requests?cursor=`, first page). */
export function useRequests(enabled = true) {
  return useQuery({
    queryKey: queryKeys.requests(),
    queryFn: ({ signal }) => api.requests.list(null, signal),
    enabled,
    staleTime: 15_000,
  });
}
