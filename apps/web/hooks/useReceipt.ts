'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';

const POLL_MS = 20_000;
const MAX_POLL_MS = 2 * 60 * 60 * 1000;

/**
 * Receipt for a request (`GET /api/requests/:id`, proposed). The session id is available
 * immediately; the tx hash appears after settlement (PDF: every $1 or hourly), so we poll every
 * 20 s for up to 2 h until it arrives.
 */
export function useReceipt(requestId: string | null) {
  return useQuery({
    queryKey: queryKeys.request(requestId ?? ''),
    queryFn: ({ signal }) => api.requests.get(requestId ?? '', signal),
    enabled: requestId !== null,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.tx_hash || data.is_free) return false;
      if (Date.now() - Date.parse(data.created_at) > MAX_POLL_MS) return false;
      return POLL_MS;
    },
  });
}
