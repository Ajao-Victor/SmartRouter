'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { TaskType } from '@/lib/api/types';

/** Model catalog (`GET /api/models`, proposed). Stale for 5 minutes (PDF: catalog rebuilds nightly). */
export function useModels(task?: TaskType) {
  return useQuery({
    queryKey: queryKeys.models(task),
    queryFn: ({ signal }) => api.models.list(task, signal),
    staleTime: 5 * 60_000,
  });
}
