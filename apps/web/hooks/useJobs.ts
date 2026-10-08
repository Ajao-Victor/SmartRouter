'use client';

import { queryOptions, useQueries } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { Job } from '@/lib/api/types';

const POLL_MS = 3000;

function jobQuery(jobId: string) {
  return queryOptions({
    queryKey: queryKeys.job(jobId),
    queryFn: ({ signal }) => api.jobs.get(jobId, signal),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'done' || s === 'failed' ? false : POLL_MS;
    },
  });
}

/**
 * Poll async jobs (PDF: Suno and StableStudio jobs finish in the worker and the app polls them).
 * `GET /api/jobs/:id` (proposed) every 3 s until done or failed. Keyed by message id for the Thread.
 */
export function useJobs(entries: { messageId: string; jobId: string }[]): Record<string, Job> {
  const results = useQueries({ queries: entries.map((e) => jobQuery(e.jobId)) });
  const byMessageId: Record<string, Job> = {};
  results.forEach((r, i) => {
    const e = entries[i];
    if (e && r.data) byMessageId[e.messageId] = r.data;
  });
  return byMessageId;
}
