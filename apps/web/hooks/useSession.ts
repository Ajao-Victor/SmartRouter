'use client';

import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';

import { useAllocationStore } from '@/stores/allocationStore';

/**
 * Current MPP session (`GET /api/sessions/current`, proposed). Refetches every 30 s and after
 * every run; mirrors into `allocationStore` (PDF: wallet balances are never stored, sessions are).
 */
export function useSession(enabled = true) {
  const hydrate = useAllocationStore((s) => s.hydrateFromSession);
  const query = useQuery({
    queryKey: queryKeys.session.current(),
    queryFn: ({ signal }) => api.sessions.current(signal),
    refetchInterval: 30_000,
    enabled,
  });
  useEffect(() => {
    if (query.data !== undefined) hydrate(query.data);
  }, [query.data, hydrate]);
  return query;
}
