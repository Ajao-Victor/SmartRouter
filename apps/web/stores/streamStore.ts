import { create } from 'zustand';

import type { FileRef } from '@/lib/api/types';
import type { MicroUsd } from '@/lib/money';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'pending' | 'error' | 'fallback';

/** PDF `fallback`: the first model failed, trying the next best at no extra charge. */
export interface StreamFallback {
  fromModelId: string;
  toModelId: string;
  label: string;
  reason: string;
}

export interface StreamError {
  code: string;
  message: string;
  refunded: boolean;
  refundedUsd: MicroUsd | null;
  /** PDF `freeRerun.available` → one-click rerun on the free model. */
  canRerunFree: boolean;
}

export interface StreamResult {
  chargedUsd: MicroUsd;
  latencyMs: number | null;
  requestId: string;
  files: FileRef[];
  citations: unknown[];
}

export interface StreamEntry {
  text: string;
  status: StreamStatus;
  modelId: string | null;
  label: string | null;
  requestId: string | null;
  /** Server ids once `meta` arrives (the optimistic ids are replaced in the chat cache). */
  userMessageId: string | null;
  assistantMessageId: string | null;
  priceUsd: MicroUsd | null;
  free: boolean;
  heartbeatAt: number | null;
  fallback: StreamFallback | null;
  /** `pending` event: slow job continues in the background, polled at `pollUrl`. */
  pollUrl: string | null;
  error: StreamError | null;
  result: StreamResult | null;
  startedAt: number;
}

export interface StreamState {
  byMessageId: Record<string, StreamEntry>;
}

export interface StreamActions {
  start: (messageId: string, args?: { modelId?: string | null; label?: string | null; free?: boolean }) => void;
  setMeta: (messageId: string, meta: { requestId: string; modelId: string; label: string; priceUsd: MicroUsd; free: boolean; userMessageId: string | null; assistantMessageId: string | null }) => void;
  append: (messageId: string, text: string) => void;
  heartbeat: (messageId: string, at?: number) => void;
  fallback: (messageId: string, fallback: StreamFallback) => void;
  pending: (messageId: string, args: { requestId: string; pollUrl: string }) => void;
  done: (messageId: string, result: StreamResult & { text?: string | null }) => void;
  fail: (messageId: string, error: StreamError) => void;
  clear: (messageId: string) => void;
  clearAll: () => void;
}

function blank(args: { modelId: string | null; label: string | null; free: boolean }, now: number): StreamEntry {
  return {
    text: '',
    status: 'streaming',
    modelId: args.modelId,
    label: args.label,
    requestId: null,
    userMessageId: null,
    assistantMessageId: null,
    priceUsd: null,
    free: args.free,
    heartbeatAt: null,
    fallback: null,
    pollUrl: null,
    error: null,
    result: null,
    startedAt: now,
  };
}

function patch(state: StreamState, messageId: string, update: (entry: StreamEntry) => Partial<StreamEntry>): Partial<StreamState> {
  const entry = state.byMessageId[messageId];
  if (!entry) return {};
  return { byMessageId: { ...state.byMessageId, [messageId]: { ...entry, ...update(entry) } } };
}

/** Live streaming buffers per assistant message. Written only by the SSE reader (rules.md §4.4). */
export const useStreamStore = create<StreamState & StreamActions>()((set) => ({
  byMessageId: {},
  start: (messageId, args) => {
    set((s) => ({
      byMessageId: { ...s.byMessageId, [messageId]: blank({ modelId: args?.modelId ?? null, label: args?.label ?? null, free: args?.free ?? false }, Date.now()) },
    }));
  },
  setMeta: (messageId, meta) => {
    set((s) =>
      patch(s, messageId, () => ({
        requestId: meta.requestId,
        modelId: meta.modelId,
        label: meta.label || null,
        priceUsd: meta.priceUsd,
        free: meta.free,
        userMessageId: meta.userMessageId,
        assistantMessageId: meta.assistantMessageId,
      })),
    );
  },
  append: (messageId, text) => {
    if (!text) return;
    set((s) => patch(s, messageId, (e) => ({ text: e.text + text, status: 'streaming' })));
  },
  heartbeat: (messageId, at = Date.now()) => {
    set((s) => patch(s, messageId, () => ({ heartbeatAt: at })));
  },
  fallback: (messageId, fallback) => {
    set((s) => patch(s, messageId, () => ({ fallback, status: 'fallback', text: '', modelId: fallback.toModelId, label: fallback.label || null })));
  },
  pending: (messageId, args) => {
    set((s) => patch(s, messageId, () => ({ status: 'pending', requestId: args.requestId, pollUrl: args.pollUrl })));
  },
  done: (messageId, result) => {
    set((s) =>
      patch(s, messageId, (e) => ({
        status: 'done',
        text: result.text ?? e.text,
        requestId: result.requestId,
        result: { chargedUsd: result.chargedUsd, latencyMs: result.latencyMs, requestId: result.requestId, files: result.files, citations: result.citations },
      })),
    );
  },
  fail: (messageId, error) => {
    set((s) => patch(s, messageId, () => ({ status: 'error', error })));
  },
  clear: (messageId) => {
    set((s) => ({ byMessageId: Object.fromEntries(Object.entries(s.byMessageId).filter(([id]) => id !== messageId)) }));
  },
  clearAll: () => {
    set({ byMessageId: {} });
  },
}));

/* ------------------------------- selectors -------------------------------- */

export const selectEntry = (messageId: string) => (s: StreamState) => s.byMessageId[messageId];

export const selectText = (messageId: string) => (s: StreamState) => s.byMessageId[messageId]?.text ?? '';

const LIVE: ReadonlySet<StreamStatus> = new Set(['streaming', 'fallback']);

/** 0..1 activity (share of entries currently streaming). */
export const selectActivity = (s: StreamState): number => {
  const entries = Object.values(s.byMessageId);
  if (entries.length === 0) return 0;
  const live = entries.filter((e) => LIVE.has(e.status)).length;
  return Math.min(1, live / Math.max(1, entries.length));
};

export const selectAnyStreaming = (s: StreamState): boolean => Object.values(s.byMessageId).some((e) => LIVE.has(e.status));

/** PDF: at most 3 answers streaming at once; a 4th gets 429. */
export const selectLiveCount = (s: StreamState): number => Object.values(s.byMessageId).filter((e) => LIVE.has(e.status)).length;
