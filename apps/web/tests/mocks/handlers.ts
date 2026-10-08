/**
 * MSW handlers for the PROPOSED contract (Technical_Requirements.md §5.2/§5.3).
 * Scenario hooks in the prompt: `[retry]` → one retry on the next model, `[fail]` → error with
 * rerun-free offer, `[slow]` → slower stream. Free model turns consume the 30/day quota.
 */
import { delay, http, HttpResponse } from 'msw';

import type { Recommendation, SliderPreset, TaskType } from '@/lib/api/types';
import { micro, pct, ratioLabel, savingLine } from '@/lib/money';

import { FREE_MODEL_ID, mockModels, SAMPLE_REPLY } from './fixtures';
import { sseStream, tokenize, type SseEvent } from './sse';
import {
  appendMessage,
  classify,
  createChat,
  createJob,
  makeQuote,
  nextId,
  pollJob,
  pollRequest,
  pricePaid,
  recordRequest,
  state,
} from './state';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
const url = (p: string) => `${API}${p}`;

const unauthorized = () => HttpResponse.json({ code: 'unauthorized', message: 'Sign in to continue' }, { status: 401 });
const guard = () => (state.authed ? null : unauthorized());

/* ------------------------------- ranking (mock) ------------------------------ */

const WEIGHTS: Record<SliderPreset, { q: number; p: number; s: number }> = {
  cheapest: { q: 0.2, p: 0.7, s: 0.1 },
  balanced: { q: 0.45, p: 0.4, s: 0.15 },
  best: { q: 0.8, p: 0.1, s: 0.1 },
};

function speedLabel(latency: number | null): string {
  if (latency === null) return 'unknown';
  if (latency < 800) return 'fast';
  if (latency < 2500) return 'steady';
  return 'slow';
}

export function rank(task: TaskType, slider: SliderPreset, prompt: string, contextTokens: number): Recommendation[] {
  const w = WEIGHTS[slider];
  const candidates = mockModels.filter((m) => m.active && m.verified && m.task_types.includes(task) && m.id !== FREE_MODEL_ID);
  const priced = candidates.map((m) => ({ m, price: pricePaid(m.id, prompt, contextTokens) }));
  const maxQ = Math.max(...priced.map(({ m }) => m.quality_by_task[task] ?? 0.4));
  const minP = Math.min(...priced.map((x) => x.price));
  const maxP = Math.max(...priced.map((x) => x.price));
  const maxS = Math.max(...priced.map(({ m }) => m.latency ?? 3000));
  const scored = priced
    .map(({ m, price }) => {
      const q = (m.quality_by_task[task] ?? 0.4) / (maxQ || 1);
      const p = maxP === minP ? 0 : (price - minP) / (maxP - minP);
      const s = 1 - (m.latency ?? 3000) / maxS;
      const web = task === 'research' && m.id === 'perplexity:sonar' ? 0.1 : 0;
      return { m, price, q, score: w.q * q + w.p * (1 - p) + w.s * s + web };
    })
    .sort((a, b) => b.score - a.score);
  const best = [...scored].sort((a, b) => b.q - a.q)[0];
  const top = scored.filter((x) => x.m.id !== best?.m.id).slice(0, 2);
  const free = mockModels.find((m) => m.id === FREE_MODEL_ID);

  const rec = (x: (typeof scored)[number], flags: Partial<Recommendation>): Recommendation => ({
    model_id: x.m.id,
    label: x.m.label,
    provider: x.m.provider,
    price: x.price,
    speed_label: speedLabel(x.m.latency),
    reason: flags.reason ?? '',
    score: Math.round(x.score * 1000) / 1000,
    quality: Math.round(x.q * 100) / 100,
    is_free: false,
    is_best_quality: false,
    searches_web: x.m.id === 'perplexity:sonar',
    quote_id: null,
    ...flags,
  });

  const out: Recommendation[] = [];
  const first = top[0];
  const second = top[1];
  if (first && best) {
    out.push(rec(first, { reason: savingLine(pct(first.q, 1), ratioLabel(first.price, best.price)) }));
  }
  if (second && best) {
    out.push(rec(second, { reason: `${speedLabel(second.m.latency)} and ${ratioLabel(second.price, best.price)} of the price` }));
  }
  if (best) out.push(rec(best, { is_best_quality: true, reason: `Best quality for ${task}` }));
  if (free && task !== 'image' && task !== 'music') {
    out.push({
      model_id: free.id,
      label: free.label,
      provider: free.provider,
      price: micro(0),
      speed_label: 'fast',
      reason: 'Never stuck — 30 free messages a day',
      score: 0,
      quality: Math.round(((free.quality_by_task[task] ?? 0.4) / (maxQ || 1)) * 100) / 100,
      is_free: true,
      is_best_quality: false,
      searches_web: false,
      quote_id: null,
    });
  }
  return out;
}

/* --------------------------------- handlers --------------------------------- */

export const handlers = [
  http.get(url('/api/auth/nonce'), () => HttpResponse.json({ nonce: nextId('nonce').padEnd(12, 'x') })),
  http.post(url('/api/auth/verify'), async () => {
    await delay(300);
    state.authed = true;
    return HttpResponse.json({ user: state.user });
  }),
  http.post(url('/api/auth/logout'), () => {
    state.authed = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(url('/api/me'), () => guard() ?? HttpResponse.json(state.user)),
  http.patch(url('/api/me/settings'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const patch = (await request.json()) as Record<string, unknown>;
    state.user = { ...state.user, ...patch };
    return HttpResponse.json(state.user);
  }),

  http.get(url('/api/models'), ({ request }) => {
    const task = new URL(request.url).searchParams.get('task') as TaskType | null;
    return HttpResponse.json(task ? mockModels.filter((m) => m.task_types.includes(task)) : mockModels);
  }),

  http.get(url('/api/chats'), () => guard() ?? HttpResponse.json([...state.chats.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)))),
  http.post(url('/api/chats'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const body = (await request.json()) as { task_type?: TaskType; first_prompt?: string };
    return HttpResponse.json(createChat(body), { status: 201 });
  }),
  http.get(url('/api/chats/:id'), ({ params }) => {
    const g = guard();
    if (g) return g;
    const chat = state.chats.get(String(params.id));
    if (!chat) return HttpResponse.json({ code: 'not_found', message: 'Chat not found' }, { status: 404 });
    return HttpResponse.json({ ...chat, messages: state.messages.get(chat.id) ?? [] });
  }),
  http.patch(url('/api/chats/:id'), async ({ params, request }) => {
    const g = guard();
    if (g) return g;
    const chat = state.chats.get(String(params.id));
    if (!chat) return HttpResponse.json({ code: 'not_found' }, { status: 404 });
    const body = (await request.json()) as { current_model_id?: string };
    if (body.current_model_id) chat.current_model_id = body.current_model_id;
    return HttpResponse.json(chat);
  }),
  http.post(url('/api/chats/:id/quote'), async ({ params, request }) => {
    const g = guard();
    if (g) return g;
    const chat = state.chats.get(String(params.id));
    if (!chat) return HttpResponse.json({ code: 'not_found' }, { status: 404 });
    const body = (await request.json()) as { prompt: string; model_id?: string; slider?: SliderPreset };
    await delay(350);
    const classification = classify(body.prompt);
    const history = (state.messages.get(chat.id) ?? []).reduce((n, m) => n + (m.tokens ?? 0), 0);
    const contextTokens = Math.min(8000, history + Math.ceil(body.prompt.length / 4));
    const recommendations = rank(classification.task_type, body.slider ?? chat.slider, body.prompt, contextTokens);
    for (const r of recommendations) {
      if (!r.is_free) r.quote_id = makeQuote(chat.id, r.model_id, body.prompt, contextTokens).id;
    }
    const chosen = body.model_id ?? chat.current_model_id ?? recommendations[0]?.model_id ?? FREE_MODEL_ID;
    const existing = recommendations.find((r) => r.model_id === chosen);
    const quote = existing?.quote_id ? state.quotes.get(existing.quote_id) : makeQuote(chat.id, chosen, body.prompt, contextTokens);
    const suggestion =
      chat.task_type !== classification.task_type && recommendations[0] && !body.model_id
        ? { model_id: recommendations[0].model_id, task_type: classification.task_type, reason: `This looks like ${classification.task_type}` }
        : null;
    return HttpResponse.json({ classification, recommendations, quote, suggestion });
  }),

  http.post(url('/api/sessions'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const body = (await request.json()) as { channel_id: string; authorized_signer: string };
    state.session = {
      channel_id: body.channel_id,
      user_id: state.user.id,
      authorized_signer: body.authorized_signer,
      deposit: state.user.allocation,
      highest_voucher: micro(0),
      counted: micro(0),
      settled: micro(0),
      last_used_at: null,
      status: 'open',
    };
    return HttpResponse.json(state.session, { status: 201 });
  }),
  http.get(url('/api/sessions/current'), () => guard() ?? HttpResponse.json(state.session)),
  http.post(url('/api/sessions/:id/top-up'), async ({ params, request }) => {
    const g = guard();
    if (g) return g;
    const body = (await request.json()) as { amount: number };
    if (!state.session || state.session.channel_id !== String(params.id)) {
      return HttpResponse.json({ code: 'session_closed', message: 'No open allocation' }, { status: 402 });
    }
    state.session.deposit = micro(state.session.deposit + body.amount);
    state.session.status = 'open';
    return HttpResponse.json(state.session);
  }),

  http.get(url('/api/jobs/:id'), ({ params }) => {
    const job = pollJob(String(params.id));
    return job ? HttpResponse.json(job) : HttpResponse.json({ code: 'not_found' }, { status: 404 });
  }),
  http.get(url('/api/requests/:id'), ({ params }) => {
    const r = pollRequest(String(params.id));
    return r ? HttpResponse.json(r) : HttpResponse.json({ code: 'not_found' }, { status: 404 });
  }),

  http.post(url('/api/feedback'), () => new HttpResponse(null, { status: 204 })),
  http.post(url('/api/compare-votes'), () => new HttpResponse(null, { status: 204 })),
  http.get(url('/api/free/usage'), () => guard() ?? HttpResponse.json({ messages: state.freeMessages, limit: 30 })),
  http.post(url('/api/waitlist'), async () => {
    await delay(300);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(url('/run'), async ({ request }) => {
    const g = guard();
    if (g) return g;
    const body = (await request.json()) as {
      quote_id: string | null;
      chat_id: string;
      model_id: string;
      voucher?: { channel_id: string; cumulative_amount: number; signature: string };
    };
    const chat = state.chats.get(body.chat_id);
    if (!chat) return HttpResponse.json({ code: 'not_found', message: 'Chat not found' }, { status: 404 });
    const isFree = body.model_id === FREE_MODEL_ID;
    const quote = body.quote_id ? (state.quotes.get(body.quote_id) ?? null) : null;

    if (isFree) {
      if (state.freeMessages >= 30) {
        return HttpResponse.json({ code: 'free_quota_exhausted', message: '30/30 free messages used today' }, { status: 402 });
      }
    } else {
      if (!quote) return HttpResponse.json({ code: 'quote_expired', message: 'Quote missing or expired' }, { status: 409 });
      if (Date.parse(quote.expires_at) < Date.now()) {
        return HttpResponse.json({ code: 'quote_expired', message: 'Quote expired — re-quote' }, { status: 409 });
      }
      if (!state.session || state.session.status !== 'open') {
        return HttpResponse.json({ code: 'session_closed', message: 'No open allocation' }, { status: 402 });
      }
      const remaining = state.session.deposit - state.session.highest_voucher;
      if (!body.voucher || quote.price > remaining || body.voucher.cumulative_amount > state.session.deposit) {
        return HttpResponse.json({ code: 'allocation_exceeded', message: 'Allocation used — Top up $2' }, { status: 402 });
      }
    }

    const lastUser = [...(state.messages.get(chat.id) ?? [])].reverse().find((m) => m.role === 'user');
    const prompt = lastUser?.content ?? '';
    const scenario = { retry: /\[retry\]/i.test(prompt), fail: /\[fail\]/i.test(prompt), slow: /\[slow\]/i.test(prompt) };
    const task = chat.task_type;
    const requestId = nextId('req');
    const events: SseEvent[] = [{ event: 'meta', data: { request_id: requestId, model_id: body.model_id, quote_id: body.quote_id, session_id: state.session?.channel_id ?? null } }];
    const price = isFree ? micro(0) : (quote?.price ?? micro(0));

    if (scenario.fail) {
      events.push({ event: 'error', delay: 600, data: { code: 'provider_failed', message: 'Provider failed twice', can_rerun_free: !isFree } });
      return new HttpResponse(sseStream(events), { headers: { 'Content-Type': 'text/event-stream' } });
    }

    let modelId = body.model_id;
    if (scenario.retry && !isFree) {
      const alt = mockModels.find((m) => m.id !== modelId && m.task_types.includes(task) && m.id !== FREE_MODEL_ID);
      if (alt) {
        events.push({ event: 'token', delay: 300, data: { text: 'Starting' } });
        events.push({ event: 'retry', delay: 500, data: { from_model_id: modelId, to_model_id: alt.id, reason: 'provider timeout' } });
        modelId = alt.id;
      }
    }

    if (task === 'image') {
      events.push({ event: 'heartbeat', delay: 800, data: {} });
      events.push({ event: 'file', delay: 1200, data: { url: 'https://picsum.photos/seed/smartrouter/768/768', mime: 'image/jpeg' } });
    } else if (task === 'music') {
      const job = createJob(requestId);
      events.push({ event: 'job', delay: 500, data: { job_id: job.id } });
    } else {
      const chunks = tokenize(SAMPLE_REPLY[task] || SAMPLE_REPLY.chat);
      chunks.forEach((text, i) => {
        events.push({ event: 'token', delay: i === 0 ? 350 : scenario.slow ? 120 : 45, data: { text } });
        if (i === 12) events.push({ event: 'heartbeat', data: {} });
      });
    }

    const latency = events.reduce((n, e) => n + (e.delay ?? 0), 0);
    const receipt = recordRequest({ chatId: chat.id, quote, modelId, isFree, price, latencyMs: latency, voucher: isFree ? null : (quote?.price ?? null) });
    if (isFree) state.freeMessages += 1;
    const reply = task === 'image' || task === 'music' ? '' : SAMPLE_REPLY[task] || SAMPLE_REPLY.chat;
    appendMessage(chat.id, {
      role: 'assistant',
      content: reply,
      attachments: [],
      model_id: modelId,
      request_id: receipt.id,
      result_ref: task === 'image' ? 'https://picsum.photos/seed/smartrouter/768/768' : null,
      tokens: Math.ceil(reply.length / 4),
      status: 'done',
    });
    chat.current_model_id = modelId;
    events.push({ event: 'done', delay: 150, data: { request_id: receipt.id, price, provider_cost: receipt.provider_cost, latency_ms: latency, voucher_amount: receipt.voucher_amount } });
    return new HttpResponse(sseStream(events), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  }),
];
