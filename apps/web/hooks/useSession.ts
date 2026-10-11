'use client';

import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';

import { useAllocationStore } from '@/stores/allocationStore';
import { useUsageStore } from '@/stores/usageStore';

/**
 * Payment setup and the open deposit (`GET /sessions/current`): `paidRunsEnabled`, `network`,
 * `suggestedDepositUsd`, `usage`, `session`. Asked on sign-in and refreshed after each `done`
 * event, top-up and close — no polling (Handover "Usage banners").
 */
export function useSession(enabled = true) {
  const hydrate = useAllocationStore((s) => s.hydrate);
  const query = useQuery({
    queryKey: queryKeys.session.current(),
    queryFn: ({ signal }) => api.sessions.current(signal),
    enabled,
  });
  useEffect(() => {
    if (query.data === undefined) return;
    hydrate(query.data);
    if (query.data.usage) useUsageStore.getState().setUsage(query.data.usage);
  }, [query.data, hydrate]);
  return query;
}

/** Imperative refresh for run completion, top-up and close. */
export function useRefreshSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.session.current() });
}
