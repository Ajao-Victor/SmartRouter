/**
 * Typed endpoint functions — every route from "SmartRouter Frontend Architecture"
 * (Screens and the endpoints each uses; Wallet and sign-in; Paying for runs).
 */
import { apiFetch } from '@/lib/api/client';
import {
  catalogSchema,
  challengeResponseSchema,
  chatHistorySchema,
  chatListSchema,
  chatSchema,
  createChatResponseSchema,
  quoteSchema,
  recommendResponseSchema,
  requestListSchema,
  requestSchema,
  sessionsCurrentSchema,
  userSchema,
  type ChallengeInput,
  type ChatPatch,
  type CompareVoteInput,
  type CreateChatInput,
  type FeedbackInput,
  type QuoteInput,
  type RecommendInput,
  type SettingsPatch,
  type TaskType,
  type VerifyInput,
  type WaitlistInput,
} from '@/lib/api/types';

const sig = (signal?: AbortSignal) => (signal ? { signal } : {});

export const auth = {
  /** `POST /auth/challenge { address, origin }` → SIWE message for chain 4217/42431 with a nonce. */
  challenge: (input: ChallengeInput) => apiFetch('/auth/challenge', { method: 'POST', body: input, schema: challengeResponseSchema }),
  /** `POST /auth/verify { message, signature }` sets the `sr_session` cookie. */
  verify: (input: VerifyInput) => apiFetch<unknown>('/auth/verify', { method: 'POST', body: input }),
  /** `POST /auth/logout` clears the cookie. */
  logout: () => apiFetch<unknown>('/auth/logout', { method: 'POST' }),
};

export const me = {
  /** `GET /me` — 401 means signed out. */
  get: (signal?: AbortSignal) => apiFetch('/me', { schema: userSchema, ...sig(signal) }),
  /** `PATCH /me/settings { slider?, allocationUsd?, weeklyLimitUsd?, autoFreeFallback? }`. */
  updateSettings: (patch: SettingsPatch) => apiFetch('/me/settings', { method: 'PATCH', body: patch, schema: userSchema }),
};

export const catalog = {
  /** `GET /catalog?taskType=` — all models by task, quality and price. */
  list: (taskType?: TaskType, signal?: AbortSignal) =>
    apiFetch(taskType ? `/catalog?taskType=${encodeURIComponent(taskType)}` : '/catalog', { schema: catalogSchema, ...sig(signal) }),
  /** `POST /recommend { prompt, slider?, taskType? }` — options for a prompt. */
  recommend: (input: RecommendInput, signal?: AbortSignal) =>
    apiFetch('/recommend', { method: 'POST', body: input, schema: recommendResponseSchema, ...sig(signal) }),
};

export const chats = {
  /** `GET /chats?cursor=` */
  list: (cursor?: string | null, signal?: AbortSignal) =>
    apiFetch(cursor ? `/chats?cursor=${encodeURIComponent(cursor)}` : '/chats', { schema: chatListSchema, ...sig(signal) }),
  /** `POST /chats { taskType?, description?, slider? }` → `chatId`, `options[]`. */
  create: (input: CreateChatInput) => apiFetch('/chats', { method: 'POST', body: input, schema: createChatResponseSchema }),
  /** `GET /chats/:id` (history, paged with `before`). */
  get: (chatId: string, before?: string | null, signal?: AbortSignal) =>
    apiFetch(`/chats/${encodeURIComponent(chatId)}${before ? `?before=${encodeURIComponent(before)}` : ''}`, { schema: chatHistorySchema, ...sig(signal) }),
  /** `PATCH /chats/:id { title?, slider?, currentModelId? }`. */
  update: (chatId: string, patch: ChatPatch) =>
    apiFetch(`/chats/${encodeURIComponent(chatId)}`, { method: 'PATCH', body: patch, schema: chatSchema }),
  /** `DELETE /chats/:id` (archive). */
  remove: (chatId: string) => apiFetch<unknown>(`/chats/${encodeURIComponent(chatId)}`, { method: 'DELETE' }),
  /** `POST /chats/:id/quote { prompt, modelId? }` → `quoteId`, `priceUsd`, `free`, `expiresAt`, `suggestion?`. */
  quote: (chatId: string, input: QuoteInput, signal?: AbortSignal) =>
    apiFetch(`/chats/${encodeURIComponent(chatId)}/quote`, { method: 'POST', body: input, schema: quoteSchema, ...sig(signal) }),
};

export const sessions = {
  /** `GET /sessions/current` → `suggestedDepositUsd`, `network`, `session?`. */
  current: (signal?: AbortSignal) => apiFetch('/sessions/current', { schema: sessionsCurrentSchema, ...sig(signal) }),
};

export const requests = {
  /** `GET /requests?cursor=` — past runs and what they charged. */
  list: (cursor?: string | null, signal?: AbortSignal) =>
    apiFetch(cursor ? `/requests?cursor=${encodeURIComponent(cursor)}` : '/requests', { schema: requestListSchema, ...sig(signal) }),
  /** `GET /requests/:id` — also the poll target for slow jobs (`pending` event). */
  get: (requestId: string, signal?: AbortSignal) =>
    apiFetch(`/requests/${encodeURIComponent(requestId)}`, { schema: requestSchema, ...sig(signal) }),
  /** Poll an absolute or relative `pollUrl` from a `pending` event (must stay on the API origin). */
  poll: (pollUrl: string, signal?: AbortSignal) => apiFetch(pollPath(pollUrl), { schema: requestSchema, ...sig(signal) }),
};

/** Only paths on the API origin are polled; anything else is reduced to its path. */
export function pollPath(pollUrl: string): string {
  try {
    const u = new URL(pollUrl, 'https://placeholder.invalid');
    return `${u.pathname}${u.search}`;
  } catch {
    return pollUrl.startsWith('/') ? pollUrl : `/${pollUrl}`;
  }
}

export const feedback = {
  /** `POST /feedback { requestId, rating: 1 | -1 }`. */
  rate: (input: FeedbackInput) => apiFetch<unknown>('/feedback', { method: 'POST', body: input }),
  /** `POST /compare/vote { compareGroup, winnerRequestId, prompt }`. */
  compareVote: (input: CompareVoteInput) => apiFetch<unknown>('/compare/vote', { method: 'POST', body: input }),
};

export const waitlist = {
  /** `POST /waitlist { email, interest, country? }`. */
  join: (input: WaitlistInput) => apiFetch<unknown>('/waitlist', { method: 'POST', body: input }),
};

/** `POST /run` lives in `lib/api/sse.ts` (SSE reader over fetch / the mppx session manager). */
export const RUN_PATH = '/run';

export const api = { auth, me, catalog, chats, sessions, requests, feedback, waitlist };
export type Api = typeof api;
