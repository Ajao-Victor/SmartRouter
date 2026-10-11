'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { TaskType } from '@/lib/api/types';

/** Model catalogue (`GET /catalog?taskType=`). Stale for 5 minutes. */
export function useCatalog(taskType?: TaskType, enabled = true) {
  return useQuery({
    queryKey: queryKeys.catalog(taskType),
    queryFn: ({ signal }) => api.catalog.list(taskType, signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}
