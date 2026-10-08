/**
 * `/run` streaming client (PDF: text streams over Server-Sent Events with a heartbeat every
 * 15 s). Uses fetch + ReadableStream (POST body + cookie), parses SSE frames, Zod-validates each
 * event (shapes are PROPOSED — Backend_Gaps_Report §2.2) and enforces a 45 s heartbeat watchdog.
 */
import { z } from 'zod';

import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import type { RunInput } from '@/lib/api/types';

export const HEARTBEAT_MS = 15_000;
export const WATCHDOG_MS = 45_000;

const meta = z.object({ request_id: z.string(), model_id: z.string(), quote_id: z.string().nullable(), session_id: z.string().nullable() });
const token = z.object({ text: z.string() });
const retry = z.object({ from_model_id: z.string(), to_model_id: z.string(), reason: z.string() });
const file = z.object({ url: z.string().url(), mime: z.string() });
const job = z.object({ job_id: z.string() });
const done = z.object({
  request_id: z.string(),
  price: z.number().int(),
  provider_cost: z.number().int().nullable(),
  latency_ms: z.number().int().nullable(),
  voucher_amount: z.number().int().nullable(),
});
const error = z.object({ code: z.string(), message: z.string(), can_rerun_free: z.boolean().default(false) });

export type SseMeta = z.infer<typeof meta>;
export type SseRetry = z.infer<typeof retry>;
export type SseFile = z.infer<typeof file>;
export type SseDone = z.infer<typeof done>;
export type SseError = z.infer<typeof error>;

export interface RunHandlers {
  onMeta?: (m: SseMeta) => void;
  onToken?: (text: string) => void;
  onHeartbeat?: () => void;
  onRetry?: (r: SseRetry) => void;
  onFile?: (f: SseFile) => void;
  onJob?: (jobId: string) => void;
  onDone?: (d: SseDone) => void;
  onError?: (e: SseError) => void;
}

export type RunOutcome = { kind: 'done'; data: SseDone } | { kind: 'error'; data: SseError } | { kind: 'aborted' };

interface Frame {
  event: string;
  data: string;
}

/** Parse complete SSE frames out of a buffer; returns remaining partial text. */
export function parseFrames(buffer: string): { frames: Frame[]; rest: string } {
  const parts = buffer.split(/\n\n/);
  const rest = parts.pop() ?? '';
  const frames: Frame[] = [];
  for (const block of parts) {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (data.length > 0 || event !== 'message') frames.push({ event, data: data.join('\n') });
  }
  return { frames, rest };
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
    case 'token': {
      const p = token.safeParse(json());
      if (p.success) h.onToken?.(p.data.text);
      return null;
    }
    case 'heartbeat':
      h.onHeartbeat?.();
      return null;
    case 'retry': {
      const p = retry.safeParse(json());
      if (p.success) h.onRetry?.(p.data);
      return null;
    }
    case 'file': {
      const p = file.safeParse(json());
      if (p.success) h.onFile?.(p.data);
      return null;
    }
    case 'job': {
      const p = job.safeParse(json());
      if (p.success) h.onJob?.(p.data.job_id);
      return null;
    }
    case 'done': {
      const p = done.safeParse(json());
      if (p.success) {
        h.onDone?.(p.data);
        return { kind: 'done', data: p.data };
      }
      const e: SseError = { code: 'invalid_response', message: 'Malformed done event', can_rerun_free: false };
      h.onError?.(e);
      return { kind: 'error', data: e };
    }
    case 'error': {
      const p = error.safeParse(json());
      const e: SseError = p.success ? p.data : { code: 'unknown', message: 'Run failed', can_rerun_free: false };
      h.onError?.(e);
      return { kind: 'error', data: e };
    }
    default:
      return null;
  }
}

/**
 * Start a run and stream events to `handlers`. Resolves with the outcome. Any event resets the
 * heartbeat watchdog; silence for 45 s (3 missed heartbeats) aborts with `timeout`.
 */
export async function runStream(body: RunInput, handlers: RunHandlers, signal?: AbortSignal): Promise<RunOutcome> {
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
    const res = await api.run.start(body, controller.signal);
    const reader = res.body?.getReader();
    if (!reader) {
      const e: SseError = { code: 'invalid_response', message: 'No stream body', can_rerun_free: false };
      handlers.onError?.(e);
      return { kind: 'error', data: e };
    }
    // Aborting must unblock a pending read even when the body is not tied to the fetch signal.
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
    const e: SseError = { code: 'stream_ended', message: 'The stream ended without a result', can_rerun_free: true };
    handlers.onError?.(e);
    return { kind: 'error', data: e };
  } catch (err) {
    if (state.timedOut) {
      const e: SseError = { code: 'timeout', message: 'No heartbeat from SmartRouter for 45 s', can_rerun_free: true };
      handlers.onError?.(e);
      return { kind: 'error', data: e };
    }
    if (controller.signal.aborted || (err instanceof ApiError && err.code === 'aborted')) return { kind: 'aborted' };
    const e: SseError = {
      code: err instanceof ApiError ? err.code : 'network',
      message: err instanceof Error ? err.message : 'Run failed',
      can_rerun_free: true,
    };
    handlers.onError?.(e);
    return { kind: 'error', data: e };
  } finally {
    if (watchdog.id !== null) window.clearTimeout(watchdog.id);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}
