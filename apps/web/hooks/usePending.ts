'use client';

import { useEffect } from 'react';

import { queryOptions, useQueries, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/keys';
import type { RequestRecord } from '@/lib/api/types';

import { useChatCache } from '@/hooks/useChat';
import { useAllocationStore } from '@/stores/allocationStore';
import { useStreamStore } from '@/stores/streamStore';

const POLL_MS = 5_000;

function pendingQuery(requestId: string, pollUrl: string) {
  return queryOptions({
    queryKey: queryKeys.request(requestId),
    queryFn: ({ signal }) => api.requests.poll(pollUrl, signal),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'succeeded' || s === 'failed' ? false : POLL_MS;
    },
  });
}

/**
 * PDF `pending` event: a slow song or image job continues in the background — show "still
 * working" and poll `GET /requests/:id` every 5 s until `succeeded` or `failed`, then finish the
 * bubble with the result (or the error) and refresh the balance.
 */
export function usePending(chatId: string) {
  const qc = useQueryClient();
  const cache = useChatCache(chatId);
  const entries = useStreamStore((s) => s.byMessageId);
  const pendingEntries = Object.entries(entries).filter(([, e]) => e.status === 'pending' && e.pollUrl && e.requestId);
  const results = useQueries({ queries: pendingEntries.map(([, e]) => pendingQuery(e.requestId ?? '', e.pollUrl ?? '')) });

  useEffect(() => {
    results.forEach((r, i) => {
      const entry = pendingEntries[i];
      const data: RequestRecord | undefined = r.data;
      if (!entry || !data) return;
      const [messageId] = entry;
      if (data.status === 'succeeded') {
        useStreamStore.getState().done(messageId, { chargedUsd: data.chargedUsd, latencyMs: data.latencyMs, requestId: data.requestId, files: data.files, citations: data.citations, text: data.text });
        useAllocationStore.getState().applyCharge(data.chargedUsd);
        cache.update(messageId, { text: data.text ?? '', files: data.files, requestId: data.requestId, status: 'done' });
        void qc.invalidateQueries({ queryKey: queryKeys.session.current() });
      } else if (data.status === 'failed') {
        useStreamStore.getState().fail(messageId, { code: 'PROVIDER_FAILED', message: data.error ?? 'The job failed. You were not charged.', refunded: true, refundedUsd: data.refundedUsd, canRerunFree: true });
        cache.update(messageId, { status: 'error' });
      }
    });
    // Only react to new poll results; identities of the helper objects are stable enough per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.map((r) => r.dataUpdatedAt).join(',')]);
}
