'use client';

import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';

import { selectIsSignedIn, useAuthStore } from '@/stores/authStore';
import { useUsageStore } from '@/stores/usageStore';

/**
 * Current user from `GET /me` (`id, address, email, loginMethod, usage, settings`). Only asked
 * when signed in — guests never call it. Its `usage` seeds the banner when the app loads.
 */
export function useMe() {
  const signedIn = useAuthStore(selectIsSignedIn);
  const query = useQuery({
    queryKey: queryKeys.me(),
    queryFn: ({ signal }) => api.me.get(signal),
    staleTime: 60_000,
    enabled: signedIn,
  });
  const usage = query.data?.usage;
  useEffect(() => {
    if (usage !== undefined) useUsageStore.getState().setUsage(usage);
  }, [usage]);
  const isUnauthenticated = !signedIn || (isApiError(query.error) && query.error.code === 'UNAUTHENTICATED');
  const isOffline = isApiError(query.error) && query.error.code === 'NETWORK';
  return { ...query, isUnauthenticated, isOffline, signedIn };
}
