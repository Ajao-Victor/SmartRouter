'use client';

import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';

import { useAllocationStore } from '@/stores/allocationStore';

/**
 * Payment session summary (`GET /sessions/current`): `suggestedDepositUsd`, `network`,
 * `session? { depositUsd, spentUsd, remainingUsd, requests }`. Refetches every 30 s and after
 * every `done` event (PDF: refresh the balance after each run); mirrored into `allocationStore`.
 */
export function useSession(enabled = true) {
  const hydrate = useAllocationStore((s) => s.hydrate);
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

/** Imperative refresh for run completion, top-up and close. */
export function useRefreshSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.session.current() });
}
