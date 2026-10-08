import { create } from 'zustand';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error' | 'retrying';

export interface StreamRetry {
  fromModelId: string;
  toModelId: string;
  reason: string;
}

export interface StreamFile {
  url: string;
  mime: string;
}

export interface StreamError {
  code: string;
  message: string;
  canRerunFree: boolean;
}

export interface StreamResult {
  priceMicro: number;
  latencyMs: number | null;
  requestId: string | null;
}

export interface StreamEntry {
  tokens: string[];
  status: StreamStatus;
  modelId: string | null;
  requestId: string | null;
  /** Epoch ms of the last `heartbeat` (PDF: every 15 s). */
  heartbeatAt: number | null;
  retry: StreamRetry | null;
  file: StreamFile | null;
  jobId: string | null;
  error: StreamError | null;
  result: StreamResult | null;
  startedAt: number;
}

export interface StreamState {
  byMessageId: Record<string, StreamEntry>;
}

export interface StreamActions {
  start: (messageId: string, args?: { modelId?: string | null }) => void;
  setMeta: (messageId: string, meta: { requestId: string; modelId: string }) => void;
  /** Append a batch of tokens (the SSE parser batches per animation frame). */
  appendTokens: (messageId: string, tokens: readonly string[]) => void;
  heartbeat: (messageId: string, at?: number) => void;
  /** Retry once on the next-ranked model, no extra charge (PDF). */
  retry: (messageId: string, retry: StreamRetry) => void;
  file: (messageId: string, file: StreamFile) => void;
  job: (messageId: string, jobId: string) => void;
  done: (messageId: string, result?: StreamResult) => void;
  fail: (messageId: string, error: StreamError) => void;
  clear: (messageId: string) => void;
  clearAll: () => void;
}

function blank(modelId: string | null, now: number): StreamEntry {
  return {
    tokens: [],
    status: 'streaming',
    modelId,
    requestId: null,
    heartbeatAt: null,
    retry: null,
    file: null,
    jobId: null,
    error: null,
    result: null,
    startedAt: now,
  };
}

function patch(
  state: StreamState,
  messageId: string,
  update: (entry: StreamEntry) => Partial<StreamEntry>,
): Partial<StreamState> {
  const entry = state.byMessageId[messageId];
  if (!entry) return {};
  return { byMessageId: { ...state.byMessageId, [messageId]: { ...entry, ...update(entry) } } };
}

/** Live streaming buffers per assistant message. Written only by the SSE parser (rules.md §4.4). */
export const useStreamStore = create<StreamState & StreamActions>()((set) => ({
  byMessageId: {},
  start: (messageId, args) => {
    set((s) => ({
      byMessageId: { ...s.byMessageId, [messageId]: blank(args?.modelId ?? null, Date.now()) },
    }));
  },
  setMeta: (messageId, meta) => {
    set((s) => patch(s, messageId, () => ({ requestId: meta.requestId, modelId: meta.modelId })));
  },
  appendTokens: (messageId, tokens) => {
    if (tokens.length === 0) return;
    set((s) => patch(s, messageId, (e) => ({ tokens: [...e.tokens, ...tokens], status: 'streaming' })));
  },
  heartbeat: (messageId, at = Date.now()) => {
    set((s) => patch(s, messageId, () => ({ heartbeatAt: at })));
  },
  retry: (messageId, retry) => {
    set((s) =>
      patch(s, messageId, () => ({ retry, status: 'retrying', tokens: [], modelId: retry.toModelId })),
    );
  },
  file: (messageId, file) => {
    set((s) => patch(s, messageId, () => ({ file })));
  },
  job: (messageId, jobId) => {
    set((s) => patch(s, messageId, () => ({ jobId })));
  },
  done: (messageId, result) => {
    set((s) => patch(s, messageId, () => ({ status: 'done', result: result ?? null })));
  },
  fail: (messageId, error) => {
    set((s) => patch(s, messageId, () => ({ status: 'error', error })));
  },
  clear: (messageId) => {
    set((s) => ({
      byMessageId: Object.fromEntries(
        Object.entries(s.byMessageId).filter(([id]) => id !== messageId),
      ),
    }));
  },
  clearAll: () => {
    set({ byMessageId: {} });
  },
}));

/* ------------------------------- selectors -------------------------------- */

export const selectEntry = (messageId: string) => (s: StreamState) => s.byMessageId[messageId];

export const selectText = (messageId: string) => (s: StreamState) =>
  s.byMessageId[messageId]?.tokens.join('') ?? '';

/** 0..1 activity for the orb / field: share of entries currently streaming or retrying. */
export const selectActivity = (s: StreamState): number => {
  const entries = Object.values(s.byMessageId);
  if (entries.length === 0) return 0;
  const live = entries.filter((e) => e.status === 'streaming' || e.status === 'retrying').length;
  return Math.min(1, live / Math.max(1, entries.length));
};

export const selectAnyStreaming = (s: StreamState): boolean =>
  Object.values(s.byMessageId).some((e) => e.status === 'streaming' || e.status === 'retrying');
