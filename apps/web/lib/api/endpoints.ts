/**
 * Typed endpoint functions.
 *
 * Only `/run` and provider 402 reads are confirmed by the PDF. Every other route here is
 * PROPOSED (Technical_Requirements.md §5.2, Backend_Gaps_Report §1) and isolated in this
 * single file so the paths/bodies can be swapped in one edit once the API team answers.
 */
import { z } from 'zod';

import { apiFetch, apiStream } from '@/lib/api/client';
import {
  authResponseSchema,
  chatSchema,
  chatWithMessagesSchema,
  freeUsageSchema,
  jobSchema,
  modelSchema,
  nonceSchema,
  quoteResponseSchema,
  requestReceiptSchema,
  userSchema,
  userSessionSchema,
  type CompareVoteInput,
  type CreateChatInput,
  type FeedbackInput,
  type QuoteInput,
  type RegisterSessionInput,
  type RunInput,
  type SettingsPatch,
  type TaskType,
  type VerifyInput,
  type WaitlistInput,
} from '@/lib/api/types';

/** PDF names the run endpoint as `/run` (also written `/api/run`). Confirm: Gaps §2. */
export const RUN_PATH = '/run';

export const auth = {
  nonce: (signal?: AbortSignal) =>
    apiFetch('/api/auth/nonce', { schema: nonceSchema, ...(signal ? { signal } : {}) }),
  verify: (input: VerifyInput) =>
    apiFetch('/api/auth/verify', { method: 'POST', body: input, schema: authResponseSchema }),
  logout: () => apiFetch<undefined>('/api/auth/logout', { method: 'POST' }),
};

export const me = {
  get: (signal?: AbortSignal) =>
    apiFetch('/api/me', { schema: userSchema, ...(signal ? { signal } : {}) }),
  updateSettings: (patch: SettingsPatch) =>
    apiFetch('/api/me/settings', { method: 'PATCH', body: patch, schema: userSchema }),
};

export const models = {
  list: (task?: TaskType, signal?: AbortSignal) =>
    apiFetch(task ? `/api/models?task=${encodeURIComponent(task)}` : '/api/models', {
      schema: z.array(modelSchema),
      ...(signal ? { signal } : {}),
    }),
};

export const chats = {
  list: (signal?: AbortSignal) =>
    apiFetch('/api/chats', { schema: z.array(chatSchema), ...(signal ? { signal } : {}) }),
  create: (input: CreateChatInput) =>
    apiFetch('/api/chats', { method: 'POST', body: input, schema: chatSchema }),
  get: (chatId: string, signal?: AbortSignal) =>
    apiFetch(`/api/chats/${encodeURIComponent(chatId)}`, {
      schema: chatWithMessagesSchema,
      ...(signal ? { signal } : {}),
    }),
  /** Switch the chat's current model (PDF: any turn can name another model). */
  update: (chatId: string, patch: { current_model_id: string }) =>
    apiFetch(`/api/chats/${encodeURIComponent(chatId)}`, {
      method: 'PATCH',
      body: patch,
      schema: chatSchema,
    }),
  /** Classify + rank + quote for the next turn (PDF lifecycle steps 2–5). */
  quote: (chatId: string, input: QuoteInput, signal?: AbortSignal) =>
    apiFetch(`/api/chats/${encodeURIComponent(chatId)}/quote`, {
      method: 'POST',
      body: input,
      schema: quoteResponseSchema,
      ...(signal ? { signal } : {}),
    }),
};

export const sessions = {
  /** Register an opened channel and its browser voucher signer (PDF: authorizedSigner). */
  register: (input: RegisterSessionInput) =>
    apiFetch('/api/sessions', { method: 'POST', body: input, schema: userSessionSchema }),
  current: (signal?: AbortSignal) =>
    apiFetch('/api/sessions/current', {
      schema: userSessionSchema.nullable(),
      ...(signal ? { signal } : {}),
    }),
};

export const jobs = {
  /** Poll Suno / StableStudio jobs finished by the worker (PDF lifecycle step 9). */
  get: (jobId: string, signal?: AbortSignal) =>
    apiFetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      schema: jobSchema,
      ...(signal ? { signal } : {}),
    }),
};

export const requests = {
  /** Receipt: session id immediately, tx hash after settlement (PDF). */
  get: (requestId: string, signal?: AbortSignal) =>
    apiFetch(`/api/requests/${encodeURIComponent(requestId)}`, {
      schema: requestReceiptSchema,
      ...(signal ? { signal } : {}),
    }),
};

export const feedback = {
  vote: (input: FeedbackInput) =>
    apiFetch<undefined>('/api/feedback', { method: 'POST', body: input }),
  compare: (input: CompareVoteInput) =>
    apiFetch<undefined>('/api/compare-votes', { method: 'POST', body: input }),
};

export const free = {
  usage: (signal?: AbortSignal) =>
    apiFetch('/api/free/usage', { schema: freeUsageSchema, ...(signal ? { signal } : {}) }),
};

export const waitlist = {
  join: (input: WaitlistInput) =>
    apiFetch<undefined>('/api/waitlist', { method: 'POST', body: input }),
};

export const run = {
  /**
   * Start a run. Returns the raw streaming `Response` (SSE, heartbeat every 15 s — PDF).
   * Parsing lives in `lib/api/sse.ts` (Task 21).
   */
  start: (input: RunInput, signal?: AbortSignal) => apiStream(RUN_PATH, input, signal),
};

export const api = { auth, me, models, chats, sessions, jobs, requests, feedback, free, waitlist, run };
export type Api = typeof api;
