'use client';

import { useQuery } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';

/** Current user from `/api/me` (proposed). 401 → `isUnauthenticated`. */
export function useMe() {
  const query = useQuery({
    queryKey: queryKeys.me(),
    queryFn: ({ signal }) => api.me.get(signal),
    staleTime: 60_000,
  });
  const isUnauthenticated = isApiError(query.error) && query.error.code === 'unauthorized';
  const isOffline = isApiError(query.error) && query.error.code === 'network';
  return { ...query, isUnauthenticated, isOffline };
}
