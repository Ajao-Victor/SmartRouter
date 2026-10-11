/**
 * MSW handlers for the LIVE contract ("SmartRouter Frontend Architecture"). Routes have no
 * `/api` prefix, money is USD decimals, errors are `{ code, message, details? }`, `/run` streams
 * SSE (`meta`, `delta`, heartbeat comments, `fallback`, `pending`, `done`, `error`).
 * Prompt hooks for demos: `[fallback]`, `[fail]`, `[pending]`, `[slow]`.
 */
import { delay, http, HttpResponse } from 'msw';

import type { SliderPreset, TaskType } from '@/lib/api/types';

import { FREE_MODEL_ID, SAMPLE_FILES, SAMPLE_REPLY, mockModels } from './fixtures';
import { sseStream, tokenize, type SseEvent } from './sse';
import {
  appendMessage,
  charge,
  classify,
  createChat,
  FREE_LIMIT,
  makeQuote,
  modelById,
  nextId,
  openSession,
  optionsFor,
  pollRequest,
  publicChat,
  publicRequest,
  recordRequest,
  state,
} from './state';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
const url = (p: string) => `${API}${p}`;

const error = (status: number, code: string, message: string, details?: unknown) => HttpResponse.json({ code, message, ...(details !== undefined ? { details } : {}) }, { status });
const guard = () => (state.authed ? null : error(401, 'UNAUTHENTICATED', 'Sign in to continue'));

async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

const sliderOf = (v: unknown): SliderPreset => (v === 'cheapest' || v === 'best' ? v : 'balanced');

/** Live `network` block from `/sessions/current` (Moderato pathUSD escrow). */
const NETWORK = { chainId: 42431, token: '0x20c0000000000000000000000000000000000000', recipient: '0xD5643c5056a0DF58e7CB04F0420B892b7e84d147', operator: '0x1D410be7021e653E88A0591669d62cb335a69Ec4' };

function usage() {
  const s = state.session;
  const weeklySpent = [...state.requests.values()].reduce((sum, r) => sum + (r.status === 'succeeded' && !r.free ? r.chargedUsd : 0), 0);
  return {
    weekly: { spentUsd: weeklySpent, limitUsd: state.user.weeklyLimitUsd, usedPct: state.user.weeklyLimitUsd ? Math.round((weeklySpent / state.user.weeklyLimitUsd) * 100) : 0 },
    deposit: s && s.status === 'open' ? { channelId: s.channelId, depositUsd: s.depositUsd, spentUsd: s.spentUsd, remainingUsd: s.remainingUsd, usedPct: s.depositUsd ? Math.round((s.spentUsd / s.depositUsd) * 100) : 0 } : null,
    alert: s && s.status === 'open' ? (s.remainingUsd <= 0 ? 'used' : s.remainingUsd < s.depositUsd * 0.1 ? 'low' : null) : null,
  };
}

/** Live `/me`: settings nested, usage attached, allocation summary. */
function publicUser() {
  const s = state.session;
  const { slider, allocationUsd, weeklyLimitUsd, autoFreeFallback, address } = state.user;
  return {
    id: 'u_demo',
    address,
    email: null,
    loginMethod: 'wallet',
    country: null,
    usage: usage(),
    settings: { slider, allocationUsd, weeklyLimitUsd, autoFreeFallback },
    allocation: s && s.status === 'open' ? { channelId: s.channelId, depositUsd: s.depositUsd, usedUsd: s.spentUsd, remainingUsd: s.remainingUsd } : null,
  };
}

/** Live request record: `priceUsd` + `charged` boolean, `errorCode`. */
function liveRequest(r: ReturnType<typeof publicRequest>) {
  const { requestId, chargedUsd, refundedUsd: _refunded, error, label: _label, txHash: _tx, ...rest } = r;
  return { id: requestId, ...rest, priceUsd: r.status === 'failed' ? (r.refundedUsd ?? 0) : chargedUsd, charged: r.status !== 'failed', errorCode: error, finishedAt: r.status === 'succeeded' || r.status === 'failed' ? r.createdAt : null };
}

export const handlers = [
  /* ---------------------------------- auth --------------------------------- */
  http.post(url('/auth/challenge'), async ({ request }) => {
    const { address, origin } = await body<{ address?: string; origin?: string }>(request);
    if (!address) return error(400, 'VALIDATION_FAILED', 'address is required');
    const host = origin ? new URL(origin).host : 'localhost';
    const message = `${host} wants you to sign in with your Tempo account:\n${address}\n\nSign in to SmartRouter\n\nURI: ${origin ?? 'http://localhost'}\nVersion: 1\nChain ID: 42431\nNonce: ${nextId('nonce')}\nIssued At: ${new Date().toISOString()}`;
    return HttpResponse.json({ message });
  }),
  http.post(url('/auth/verify'), async ({ request }) => {
    const { message, signature } = await body<{ message?: string; signature?: string }>(request);
    if (!message || !signature) return error(400, 'VALIDATION_FAILED', 'message and signature are required');
    await delay(200);
    state.authed = true;
    return HttpResponse.json({ ok: true, address: state.user.address }, { headers: { 'Set-Cookie': 'sr_session=mock; Path=/; HttpOnly; SameSite=Lax' } });
  }),
  http.post(url('/auth/logout'), () => {
    state.authed = false;
    return new HttpResponse(null, { status: 204 });
  }),

  /* ----------------------------------- me ---------------------------------- */
  http.get(url('/me'), () => guard() ?? HttpResponse.json(publicUser())),
  http.patch(url('/me/settings'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const patch = await body<{ slider?: SliderPreset; allocationUsd?: number; weeklyLimitUsd?: number; autoFreeFallback?: boolean }>(request);
    if (patch.slider) state.user.slider = sliderOf(patch.slider);
    if (typeof patch.allocationUsd === 'number') state.user.allocationUsd = Math.min(50, Math.max(1, patch.allocationUsd));
    if (typeof patch.weeklyLimitUsd === 'number') state.user.weeklyLimitUsd = Math.min(500, Math.max(5, patch.weeklyLimitUsd));
    if (typeof patch.autoFreeFallback === 'boolean') state.user.autoFreeFallback = patch.autoFreeFallback;
    const { slider, allocationUsd, weeklyLimitUsd, autoFreeFallback } = state.user;
    return HttpResponse.json({ slider, allocationUsd, weeklyLimitUsd, autoFreeFallback, country: null });
  }),

  /* -------------------------------- catalogue ------------------------------- */
  http.get(url('/catalog'), ({ request }) => {
    const task = new URL(request.url).searchParams.get('taskType');
    const list = mockModels.filter((m) => !task || m.taskTypes.includes(task as TaskType));
    return HttpResponse.json({
      models: list.map((m) => ({ id: m.modelId, label: m.label, provider: m.provider, taskTypes: m.taskTypes, free: m.free, web: false, priceEstimateUsd: m.priceUsd, medianLatencyMs: m.latency, quality: m.quality })),
    });
  }),
  http.post(url('/recommend'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const { prompt, slider, taskType } = await body<{ prompt?: string; slider?: SliderPreset; taskType?: TaskType }>(request);
    if (!prompt) return error(400, 'VALIDATION_FAILED', 'prompt is required');
    const task = taskType ?? classify(prompt);
    await delay(150);
    return HttpResponse.json({ taskType: task, complexity: 'short', classifiedBy: 'rules', options: optionsFor(task, sliderOf(slider ?? state.user.slider), prompt, null) });
  }),

  /* ---------------------------------- chats -------------------------------- */
  http.get(url('/chats'), () => {
    const g = guard();
    if (g) return g;
    const chats = [...state.chats.values()].filter((c) => !c.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((c) => {
      const { updatedAt, ...rest } = publicChat(c);
      return { ...rest, lastMessageAt: updatedAt };
    });
    return HttpResponse.json({ chats, nextCursor: null });
  }),
  http.post(url('/chats'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const input = await body<{ taskType?: TaskType; description?: string; slider?: SliderPreset }>(request);
    const chat = createChat(input);
    await delay(150);
    const options = input.description ? optionsFor(chat.taskType, sliderOf(input.slider ?? state.user.slider), input.description, chat.id) : [];
    return HttpResponse.json({ chatId: chat.id, taskType: chat.taskType, complexity: 'short', classifiedBy: input.description ? 'rules' : 'user', slider: chat.slider ?? state.user.slider, options, freeRemainingToday: Math.max(0, FREE_LIMIT - state.freeUsed) }, { status: 201 });
  }),
  http.get(url('/chats/:id'), ({ params }) => {
    const g = guard();
    if (g) return g;
    const chat = state.chats.get(String(params.id));
    if (!chat || chat.archived) return error(404, 'NOT_FOUND', 'Chat not found');
    return HttpResponse.json({ chat: publicChat(chat), messages: chat.messages.map((m, i) => ({ id: m.id, seq: i + 1, role: m.role, content: m.text, modelId: m.modelId, resultRef: m.files[0]?.url ?? null, attachments: null, status: m.status, createdAt: m.createdAt })), hasMore: false });
  }),
  http.patch(url('/chats/:id'), async ({ params, request }) => {
    const g = guard();
    if (g) return g;
    const chat = state.chats.get(String(params.id));
    if (!chat) return error(404, 'NOT_FOUND', 'Chat not found');
    const patch = await body<{ title?: string; slider?: SliderPreset; currentModelId?: string }>(request);
    if (patch.title !== undefined) chat.title = patch.title;
    if (patch.slider) chat.slider = sliderOf(patch.slider);
    if (patch.currentModelId) chat.currentModelId = patch.currentModelId;
    return HttpResponse.json(publicChat(chat));
  }),
  http.delete(url('/chats/:id'), ({ params }) => {
    const g = guard();
    if (g) return g;
    const chat = state.chats.get(String(params.id));
    if (!chat) return error(404, 'NOT_FOUND', 'Chat not found');
    chat.archived = true;
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(url('/chats/:id/quote'), async ({ params, request }) => {
    const g = guard();
    if (g) return g;
    const chat = state.chats.get(String(params.id));
    if (!chat) return error(404, 'NOT_FOUND', 'Chat not found');
    const { prompt, modelId } = await body<{ prompt?: string; modelId?: string }>(request);
    if (!prompt) return error(400, 'VALIDATION_FAILED', 'prompt is required');
    const task = classify(prompt);
    const options = optionsFor(chat.taskType, sliderOf(chat.slider ?? state.user.slider), prompt, null);
    const chosen = modelId ?? chat.currentModelId ?? options[0]?.modelId ?? FREE_MODEL_ID;
    if (!modelById(chosen)) return error(404, 'NOT_FOUND', 'Unknown model');
    await delay(120);
    const q = makeQuote(chat.id, chosen, prompt);
    const suggestion = task !== chat.taskType && (task === 'image' || task === 'music' || task === 'research') ? { modelId: optionsFor(task, 'balanced', prompt, null)[0]?.modelId ?? chosen, taskType: task, reason: `looks like ${task}` } : null;
    return HttpResponse.json({ quoteId: q.quoteId, modelId: q.modelId, label: modelById(chosen)?.label ?? chosen, taskType: chat.taskType, free: q.free, priceUsd: q.priceUsd, priceSource: q.free ? 'free' : 'quote', contextTokens: Math.ceil(prompt.length / 4), expiresAt: q.expiresAt, ...(q.free ? { freeRemainingToday: Math.max(0, FREE_LIMIT - state.freeUsed) } : {}), suggestion });
  }),

  /* --------------------------------- sessions ------------------------------- */
  http.get(url('/sessions/current'), () => {
    const g = guard();
    if (g) return g;
    const s = state.session;
    return HttpResponse.json({
      paidRunsEnabled: true,
      network: NETWORK,
      suggestedDepositUsd: state.user.allocationUsd,
      usage: usage(),
      session: s ? { channelId: s.channelId, depositUsd: s.depositUsd, spentUsd: s.spentUsd, remainingUsd: s.remainingUsd, settledUsd: 0, requests: s.requests, openedAt: s.openedAt, lastUsedAt: s.openedAt } : null,
    });
  }),
  // Mock-only stand-ins for what the mppx manager does on-chain (`manager.topUp`, `manager.close`).
  http.post(url('/mock/session/top-up'), async ({ request }) => {
    const { amountUsd } = await body<{ amountUsd?: string | number }>(request);
    const amount = Number(amountUsd ?? state.user.allocationUsd) || state.user.allocationUsd;
    await delay(400);
    const s = state.session ?? openSession(0);
    s.status = 'open';
    s.depositUsd = Math.round((s.depositUsd + amount) * 1e6) / 1e6;
    s.remainingUsd = Math.round((s.depositUsd - s.spentUsd) * 1e6) / 1e6;
    return HttpResponse.json({ ok: true });
  }),
  http.post(url('/mock/session/close'), async () => {
    await delay(300);
    if (state.session) state.session.status = 'closed';
    state.session = null;
    return HttpResponse.json({ ok: true });
  }),

  /* --------------------------------- requests ------------------------------- */
  http.get(url('/requests'), () => {
    const g = guard();
    if (g) return g;
    const requests = [...state.requests.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(liveRequest);
    return HttpResponse.json({ requests, nextCursor: null });
  }),
  http.get(url('/requests/:id'), ({ params }) => {
    const g = guard();
    if (g) return g;
    const r = pollRequest(String(params.id));
    if (!r) return error(404, 'NOT_FOUND', 'Request not found');
    return HttpResponse.json(liveRequest(r));
  }),

  /* -------------------------------- feedback -------------------------------- */
  http.post(url('/feedback'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const { requestId, rating } = await body<{ requestId?: string; rating?: number }>(request);
    if (!requestId || (rating !== 1 && rating !== -1)) return error(400, 'VALIDATION_FAILED', 'requestId and rating (1 | -1) are required');
    state.feedback.push({ requestId, rating });
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(url('/compare/vote'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const { compareGroup, winnerRequestId } = await body<{ compareGroup?: string; winnerRequestId?: string }>(request);
    if (!compareGroup || !winnerRequestId) return error(400, 'VALIDATION_FAILED', 'compareGroup and winnerRequestId are required');
    state.votes.push({ compareGroup, winnerRequestId });
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(url('/waitlist'), async ({ request }) => {
    const input = await body<{ email?: string; interest?: string; country?: string }>(request);
    if (!input.email || !/.+@.+\..+/.test(input.email) || !input.interest) return error(400, 'VALIDATION_FAILED', 'email and interest are required');
    state.waitlist.push({ email: input.email, interest: input.interest, ...(input.country ? { country: input.country } : {}) });
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),

  /* ----------------------------------- run ---------------------------------- */
  http.post(url('/run'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const { quoteId, prompt, compareGroup } = await body<{ quoteId?: string; prompt?: string; compareGroup?: string }>(request);
    if (!quoteId || !prompt) return error(400, 'VALIDATION_FAILED', 'quoteId and prompt are required');
    const quote = state.quotes.get(quoteId);
    if (!quote) return error(404, 'NOT_FOUND', 'Quote not found');
    if (quote.used) return error(409, 'QUOTE_USED', 'This quote was already used');
    if (Date.parse(quote.expiresAt) <= Date.now()) return error(410, 'QUOTE_EXPIRED', 'Quote expired — ask for a new one');
    if (quote.prompt !== prompt) return error(400, 'VALIDATION_FAILED', 'The prompt differs from the quoted prompt');
    const chat = state.chats.get(quote.chatId);
    if (!chat) return error(404, 'NOT_FOUND', 'Chat not found');
    const model = modelById(quote.modelId);
    if (!model) return error(404, 'NOT_FOUND', 'Unknown model');

    if (quote.free) {
      if (state.freeUsed >= FREE_LIMIT) return error(429, 'FREE_LIMIT_REACHED', 'Free messages reset at 00:00 UTC', { scope: 'user' });
    } else {
      if (!state.session || state.session.status === 'closed') openSession(state.user.allocationUsd);
      const s = state.session;
      if (s && s.remainingUsd < quote.priceUsd) {
        return error(402, 'ALLOCATION_EXHAUSTED', 'Your allocation is used up', { priceUsd: quote.priceUsd, suggestedDepositUsd: state.user.allocationUsd, freeFallback: { available: state.freeUsed < FREE_LIMIT, modelId: FREE_MODEL_ID, freeRemainingToday: Math.max(0, FREE_LIMIT - state.freeUsed), auto: state.user.autoFreeFallback } });
      }
    }

    quote.used = true;
    const task = model.taskTypes.includes(chat.taskType) ? chat.taskType : (model.taskTypes[0] ?? 'chat');
    const userMsg = appendMessage(chat.id, { role: 'user', text: prompt, modelId: null, requestId: null, chargedUsd: null, files: [], status: 'done' });
    const requestId = nextId('req');
    const asstMsg = appendMessage(chat.id, { role: 'assistant', text: '', modelId: model.modelId, requestId, chargedUsd: null, files: [], status: 'done' });
    chat.currentModelId = model.modelId;
    if (quote.free) state.freeUsed += 1;

    const fail = /\[fail\]/i.test(prompt);
    const fallback = /\[fallback\]/i.test(prompt) && !quote.free;
    const pending = /\[pending\]/i.test(prompt) || task === 'music';
    const speed = /\[slow\]/i.test(prompt) ? 0.25 : 1;
    const started = Date.now();

    const events: SseEvent[] = [
      { event: 'meta', data: () => ({ requestId, modelId: model.modelId, label: model.label, priceUsd: quote.priceUsd, free: quote.free, chatId: chat.id, userMessageId: userMsg.id, assistantMessageId: asstMsg.id, ...(quote.free ? {} : { remainingUsd: state.session?.remainingUsd ?? null }), usage: usage() }), delay: 120 },
      { event: 'heartbeat', data: null, delay: 200 },
    ];

    if (fail) {
      asstMsg.status = 'error';
      recordRequest({ requestId, status: 'failed', modelId: model.modelId, label: model.label, chatId: chat.id, chargedUsd: 0, refundedUsd: quote.priceUsd, latencyMs: null, text: null, files: [], error: 'The provider returned an error', free: quote.free, compareGroup: compareGroup ?? null });
      events.push({ event: 'error', data: { code: 'PROVIDER_UNAVAILABLE', message: 'The provider returned an error. You were not charged.', refunded: true, refundedUsd: quote.priceUsd, freeRerun: { available: state.freeUsed < FREE_LIMIT, modelId: FREE_MODEL_ID } }, delay: 500 });
      return new HttpResponse(sseStream(events, speed), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    }

    if (pending) {
      asstMsg.status = 'pending';
      const file = SAMPLE_FILES[task === 'music' ? 'music' : 'image'];
      recordRequest({ requestId, status: 'pending', modelId: model.modelId, label: model.label, chatId: chat.id, chargedUsd: quote.priceUsd, refundedUsd: null, latencyMs: null, text: SAMPLE_REPLY[task], files: [file], error: null, free: quote.free, compareGroup: compareGroup ?? null });
      events.push({ event: 'pending', data: { requestId, pollUrl: `/requests/${requestId}` }, delay: 400 });
      return new HttpResponse(sseStream(events, speed), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    }

    let answerModel = model;
    if (fallback) {
      const next = mockModels.find((m) => !m.free && m.modelId !== model.modelId && m.taskTypes.includes(task)) ?? model;
      answerModel = next;
      events.push({ event: 'delta', data: { text: 'Starting' }, delay: 200 });
      events.push({ event: 'fallback', data: { fromModelId: model.modelId, toModelId: next.modelId, label: next.label, reason: 'provider timeout' }, delay: 600 });
      asstMsg.modelId = next.modelId;
      chat.currentModelId = next.modelId;
    }

    const reply = SAMPLE_REPLY[task];
    const files = task === 'image' ? [SAMPLE_FILES.image] : [];
    for (const t of tokenize(reply, 3)) events.push({ event: 'delta', data: { text: t }, delay: 35 });
    const charged = quote.free ? 0 : quote.priceUsd;
    events.push({
      event: 'done',
      data: () => {
        asstMsg.text = reply;
        asstMsg.files = files;
        asstMsg.chargedUsd = charged;
        chat.spentUsd = Math.round((chat.spentUsd + charged) * 1e6) / 1e6;
        if (!quote.free) charge(charged);
        recordRequest({ requestId, status: 'succeeded', modelId: answerModel.modelId, label: answerModel.label, chatId: chat.id, chargedUsd: charged, refundedUsd: null, latencyMs: Date.now() - started, text: reply, files, error: null, free: quote.free, compareGroup: compareGroup ?? null });
        return { requestId, modelId: answerModel.modelId, text: reply, files, citations: [], chargedUsd: charged, latencyMs: Date.now() - started, usage: usage() };
      },
      delay: 150,
    });
    return new HttpResponse(sseStream(events, speed), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  }),
];
