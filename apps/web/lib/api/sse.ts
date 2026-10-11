/**
 * `POST /run` streaming client (PDF "Streaming answers"): Server-Sent Events read with fetch +
 * `ReadableStream` (never `EventSource` — the request is a POST with a body). Events are
 * `event:` + JSON `data:` lines separated by a blank line; lines starting with `:` are
 * heartbeats (every 15 s) and are ignored for content but reset the watchdog.
 *
 * Paid quotes go through `paidFetch` (the mppx session manager: 402 handshake, vouchers,
 * one deposit approval); free quotes use plain `fetch`.
 */
import { z } from 'zod';

import { ApiError, apiUrl, errorFromFetchFailure, errorFromResponse, isApiError } from '@/lib/api/client';
import { RUN_PATH } from '@/lib/api/endpoints';
import { fileSchema, usageSchema, usdSchema, type RunInput } from '@/lib/api/types';
import { micro } from '@/lib/money';
import { toPaymentError } from '@/lib/tempo/paymentErrors';

export const HEARTBEAT_MS = 15_000;
/** PDF: answers can take over a minute to start; heartbeats keep the connection open. */
export const WATCHDOG_MS = 60_000;

const meta = z.object({
  requestId: z.string(),
  modelId: z.string(),
  label: z.string().default(''),
  priceUsd: usdSchema.default(0),
  free: z.boolean().default(false),
  chatId: z.string().nullish(),
  userMessageId: z.string().nullish(),
  assistantMessageId: z.string().nullish(),
  remainingUsd: usdSchema.nullish(),
  usage: usageSchema.nullish(),
});
const delta = z.object({ text: z.string() });
const fallback = z.object({ fromModelId: z.string(), toModelId: z.string(), label: z.string().default(''), reason: z.string().default('') });
const done = z.object({
  requestId: z.string(),
  modelId: z.string().default(''),
  text: z.string().nullish(),
  files: z.array(fileSchema).default([]),
  citations: z.array(z.unknown()).default([]),
  chargedUsd: usdSchema.default(0),
  latencyMs: z.number().nullish(),
  usage: usageSchema.nullish(),
});
const pending = z.object({ requestId: z.string(), pollUrl: z.string() });
const error = z.object({
  code: z.string().default('INTERNAL'),
  message: z.string().default('The run failed'),
  refunded: z.boolean().default(false),
  refundedUsd: usdSchema.nullish(),
  freeRerun: z.object({ available: z.boolean().default(false), modelId: z.string().nullish() }).nullish(),
});

export type SseMeta = z.output<typeof meta>;
export type SseFallback = z.output<typeof fallback>;
export type SseDone = z.output<typeof done>;
export type SsePending = z.output<typeof pending>;
export type SseError = z.output<typeof error>;

export interface RunHandlers {
  onMeta?: (m: SseMeta) => void;
  onDelta?: (text: string) => void;
  onHeartbeat?: () => void;
  onFallback?: (f: SseFallback) => void;
  onPending?: (p: SsePending) => void;
  onDone?: (d: SseDone) => void;
  onError?: (e: SseError) => void;
}

export type RunOutcome =
  | { kind: 'done'; data: SseDone }
  | { kind: 'pending'; data: SsePending }
  | { kind: 'error'; data: SseError }
  | { kind: 'aborted' };

interface Frame {
  event: string;
  data: string;
  /** Comment-only frame (`: heartbeat`). */
  comment: boolean;
}

/** Parse complete SSE frames out of a buffer; returns remaining partial text. */
export function parseFrames(buffer: string): { frames: Frame[]; rest: string } {
  const normalised = buffer.replace(/\r\n/g, '\n');
  const parts = normalised.split(/\n\n/);
  const rest = parts.pop() ?? '';
  const frames: Frame[] = [];
  for (const block of parts) {
    let event = 'message';
    let comment = false;
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith(':')) comment = true;
      else if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (data.length > 0 || event !== 'message') frames.push({ event, data: data.join('\n'), comment: false });
    else if (comment) frames.push({ event: 'heartbeat', data: '', comment: true });
  }
  return { frames, rest };
}

function errorEvent(code: string, message: string, freeRerun = true): SseError {
  return { code, message, refunded: true, refundedUsd: null, freeRerun: { available: freeRerun, modelId: null } };
}

function dispatch(frame: Frame, h: RunHandlers): RunOutcome | null {
  const json = (): unknown => {
    try {
      return frame.data ? JSON.parse(frame.data) : {};
    } catch {
      return {};
    }
  };
  switch (frame.event) {
    case 'meta': {
      const p = meta.safeParse(json());
      if (p.success) h.onMeta?.(p.data);
      return null;
    }
    case 'delta': {
      const p = delta.safeParse(json());
      if (p.success) h.onDelta?.(p.data.text);
      return null;
    }
    case 'heartbeat':
      h.onHeartbeat?.();
      return null;
    case 'fallback': {
      const p = fallback.safeParse(json());
      if (p.success) h.onFallback?.(p.data);
      return null;
    }
    case 'pending': {
      const p = pending.safeParse(json());
      if (p.success) {
        h.onPending?.(p.data);
        return { kind: 'pending', data: p.data };
      }
      return null;
    }
    case 'done': {
      const p = done.safeParse(json());
      if (p.success) {
        h.onDone?.(p.data);
        return { kind: 'done', data: p.data };
      }
      const e = errorEvent('INVALID_RESPONSE', 'Malformed done event');
      h.onError?.(e);
      return { kind: 'error', data: e };
    }
    case 'error': {
      const p = error.safeParse(json());
      const e: SseError = p.success ? p.data : errorEvent('INTERNAL', 'The run failed');
      h.onError?.(e);
      return { kind: 'error', data: e };
    }
    default:
      return null;
  }
}

async function openRun(body: RunInput, free: boolean, signal: AbortSignal): Promise<Response> {
  const init: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  };
  try {
    if (free) return await fetch(apiUrl(RUN_PATH), init);
    // mppx (and viem) load on the first paid run only.
    const { paidFetch } = await import('@/lib/tempo/session');
    return await paidFetch(apiUrl(RUN_PATH), init);
  } catch (err) {
    if (isApiError(err)) throw err;
    throw toPaymentError(err) ?? errorFromFetchFailure(err);
  }
}

/**
 * Start a run and stream events to `handlers`. Resolves with the outcome. Any event (including
 * heartbeat comments) resets the watchdog; silence for 60 s aborts with `TIMEOUT`.
 */
export async function runStream(body: RunInput, options: { free: boolean }, handlers: RunHandlers, signal?: AbortSignal): Promise<RunOutcome> {
  const controller = new AbortController();
  const onOuterAbort = () => {
    controller.abort();
  };
  signal?.addEventListener('abort', onOuterAbort);

  const watchdog: { id: number | null } = { id: null };
  const state = { timedOut: false };
  const kick = () => {
    if (watchdog.id !== null) window.clearTimeout(watchdog.id);
    watchdog.id = window.setTimeout(() => {
      state.timedOut = true;
      controller.abort();
    }, WATCHDOG_MS);
  };

  try {
    const res = await openRun(body, options.free, controller.signal);
    if (!res.ok) throw await errorFromResponse(res);
    const reader = res.body?.getReader();
    if (!reader) {
      const e = errorEvent('INVALID_RESPONSE', 'No stream body');
      handlers.onError?.(e);
      return { kind: 'error', data: e };
    }
    controller.signal.addEventListener('abort', () => {
      reader.cancel().catch(() => undefined);
    });
    const decoder = new TextDecoder();
    let buffer = '';
    kick();
    for (;;) {
      const { value, done: finished } = await reader.read();
      if (finished) break;
      kick();
      buffer += decoder.decode(value, { stream: true });
      const { frames, rest } = parseFrames(buffer);
      buffer = rest;
      for (const f of frames) {
        const outcome = dispatch(f, handlers);
        if (outcome) return outcome;
      }
    }
    if (state.timedOut) throw new DOMException('watchdog', 'AbortError');
    if (controller.signal.aborted) return { kind: 'aborted' };
    const tail = parseFrames(`${buffer}\n\n`);
    for (const f of tail.frames) {
      const outcome = dispatch(f, handlers);
      if (outcome) return outcome;
    }
    const e = errorEvent('STREAM_ENDED', 'The stream ended without a result');
    handlers.onError?.(e);
    return { kind: 'error', data: e };
  } catch (err) {
    if (state.timedOut) {
      const e = errorEvent('TIMEOUT', 'No heartbeat from SmartRouter for 60 s');
      handlers.onError?.(e);
      return { kind: 'error', data: e };
    }
    if (controller.signal.aborted || (err instanceof ApiError && err.code === 'ABORTED')) return { kind: 'aborted' };
    const e: SseError = {
      code: err instanceof ApiError ? err.code : 'NETWORK',
      message: err instanceof Error ? err.message : 'Run failed',
      refunded: true,
      refundedUsd: null,
      freeRerun: { available: !(err instanceof ApiError && err.code === 'FREE_LIMIT_REACHED'), modelId: null },
    };
    handlers.onError?.(e);
    return { kind: 'error', data: e };
  } finally {
    if (watchdog.id !== null) window.clearTimeout(watchdog.id);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}

export const ZERO_USD = micro(0);
