'use client';

import { useQuery } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';

/** Current user from `GET /me`. 401 → `isUnauthenticated` (PDF: use it on page load). */
export function useMe() {
  const query = useQuery({
    queryKey: queryKeys.me(),
    queryFn: ({ signal }) => api.me.get(signal),
    staleTime: 60_000,
  });
  const isUnauthenticated = isApiError(query.error) && query.error.code === 'UNAUTHENTICATED';
  const isOffline = isApiError(query.error) && query.error.code === 'NETWORK';
  return { ...query, isUnauthenticated, isOffline };
}
