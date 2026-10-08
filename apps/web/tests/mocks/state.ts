/**
 * In-memory backend state for the mock API so flows work end-to-end:
 * auth, chats/messages, quotes, sessions (allocation), requests/receipts, jobs, free usage.
 */
import type {
  Chat,
  Classification,
  Job,
  Message,
  Quote,
  RequestReceipt,
  TaskType,
  User,
  UserSession,
} from '@/lib/api/types';
import { micro, type MicroUsd } from '@/lib/money';

import { FREE_MODEL_ID, mockModels, mockSessionOpen, mockUser, NOW } from './fixtures';

export interface MockState {
  authed: boolean;
  user: User;
  session: UserSession | null;
  chats: Map<string, Chat>;
  messages: Map<string, Message[]>;
  quotes: Map<string, Quote>;
  requests: Map<string, RequestReceipt & { polls: number }>;
  jobs: Map<string, Job & { polls: number; request_id: string }>;
  freeMessages: number;
  counter: number;
}

export const state: MockState = {
  authed: true,
  user: { ...mockUser },
  session: mockSessionOpen(),
  chats: new Map(),
  messages: new Map(),
  quotes: new Map(),
  requests: new Map(),
  jobs: new Map(),
  freeMessages: 3,
  counter: 0,
};

export function resetMockState(over: Partial<Pick<MockState, 'authed' | 'session' | 'freeMessages'>> = {}): void {
  state.authed = over.authed ?? true;
  state.user = { ...mockUser };
  state.session = over.session === undefined ? mockSessionOpen() : over.session;
  state.chats.clear();
  state.messages.clear();
  state.quotes.clear();
  state.requests.clear();
  state.jobs.clear();
  state.freeMessages = over.freeMessages ?? 3;
  state.counter = 0;
  seedChats();
}

export function nextId(prefix: string): string {
  state.counter += 1;
  return `${prefix}_${String(state.counter).padStart(4, '0')}`;
}

/* ------------------------------- classification ----------------------------- */

export function classify(prompt: string): Classification {
  const p = prompt.toLowerCase();
  let task_type: TaskType = 'chat';
  if (/\b(image|picture|photo|draw|render|logo|poster)\b/.test(p)) task_type = 'image';
  else if (/\b(song|music|beat|lyrics|track)\b/.test(p)) task_type = 'music';
  else if (/\b(code|bug|function|typescript|python|refactor|sql|regex)\b/.test(p)) task_type = 'coding';
  else if (/\b(research|sources|latest|news|compare prices|find out)\b/.test(p)) task_type = 'research';
  else if (/\b(translate|translation|in yoruba|in french|in igbo)\b/.test(p)) task_type = 'translation';
  else if (/\b(write|letter|essay|email|blog|article|draft|story)\b/.test(p)) task_type = 'writing';
  const complexity = prompt.length > 240 || /\b(long|detailed|report)\b/.test(p) ? 'long' : 'short';
  return { task_type, complexity, language: 'en', needs_web: task_type === 'research' };
}

/* ---------------------------------- chats ----------------------------------- */

export function createChat(input: { task_type?: TaskType; first_prompt?: string }): Chat {
  const id = nextId('chat');
  const task_type = input.task_type ?? (input.first_prompt ? classify(input.first_prompt).task_type : 'chat');
  const chat: Chat = {
    id,
    user_id: state.user.id,
    title: null,
    task_type,
    slider: state.user.slider,
    current_model_id: null,
    summary: null,
    message_count: 0,
    spent: micro(0),
    created_at: NOW(),
    updated_at: NOW(),
  };
  state.chats.set(id, chat);
  state.messages.set(id, []);
  return chat;
}

export function appendMessage(chatId: string, m: Omit<Message, 'id' | 'chat_id' | 'seq' | 'created_at'>): Message {
  const list = state.messages.get(chatId) ?? [];
  const msg: Message = { id: nextId('msg'), chat_id: chatId, seq: list.length, created_at: NOW(), ...m };
  list.push(msg);
  state.messages.set(chatId, list);
  const chat = state.chats.get(chatId);
  if (chat) {
    chat.message_count = list.length;
    chat.updated_at = NOW();
    if (!chat.title && m.role === 'user') chat.title = m.content.slice(0, 48).replace(/\s+\S*$/, '') || 'New chat';
  }
  return msg;
}

/* ---------------------------------- quotes ---------------------------------- */

export function pricePaid(modelId: string, prompt: string, contextTokens: number): MicroUsd {
  const model = mockModels.find((m) => m.id === modelId);
  if (!model || model.id === FREE_MODEL_ID) return micro(0);
  // provider 402 ≈ price_est scaled by context, then +10% fee rounded up to $0.0001 (PDF)
  const scale = 1 + Math.min(2, contextTokens / 4000);
  const providerCost = Math.round(model.price_est * scale);
  const withFee = Math.ceil((providerCost * 11_000) / 10_000);
  return micro(Math.ceil(withFee / 100) * 100);
}

export function makeQuote(chatId: string, modelId: string, prompt: string, contextTokens: number): Quote {
  const id = nextId('q');
  const quote: Quote = {
    id,
    user_id: state.user.id,
    chat_id: chatId,
    model_id: modelId,
    prompt_hash: `h${String(Math.abs(hash(prompt)))}`,
    context_tokens: contextTokens,
    price: pricePaid(modelId, prompt, contextTokens),
    est_cost: micro(Math.round(pricePaid(modelId, prompt, contextTokens) / 1.1)),
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
  state.quotes.set(id, quote);
  return quote;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/* --------------------------------- requests --------------------------------- */

export function recordRequest(args: {
  chatId: string;
  quote: Quote | null;
  modelId: string;
  isFree: boolean;
  price: MicroUsd;
  latencyMs: number;
  voucher: MicroUsd | null;
}): RequestReceipt & { polls: number } {
  const id = nextId('req');
  const receipt: RequestReceipt & { polls: number } = {
    id,
    user_id: state.user.id,
    quote_id: args.quote?.id ?? null,
    chat_id: args.chatId,
    channel_id: args.isFree ? null : (state.session?.channel_id ?? null),
    model_id: args.modelId,
    is_free: args.isFree,
    price: args.price,
    provider_cost: args.isFree ? null : micro(Math.round(args.price / 1.1)),
    latency_ms: args.latencyMs,
    provider_receipt: args.isFree ? null : `mpp_rcpt_${id}`,
    status: 'done',
    voucher_amount: args.voucher,
    tx_hash: null,
    created_at: NOW(),
    polls: 0,
  };
  state.requests.set(id, receipt);
  if (!args.isFree && state.session) {
    state.session.highest_voucher = micro(state.session.highest_voucher + args.price);
    state.session.counted = micro(state.session.counted + args.price);
    state.session.last_used_at = NOW();
  }
  const chat = state.chats.get(args.chatId);
  if (chat) chat.spent = micro(chat.spent + args.price);
  return receipt;
}

/** Settlement simulation: the tx hash appears on the 2nd poll (PDF: every $1 or hourly). */
export function pollRequest(id: string): RequestReceipt | null {
  const r = state.requests.get(id);
  if (!r) return null;
  r.polls += 1;
  if (r.polls >= 2 && !r.is_free && !r.tx_hash) {
    r.tx_hash = `0x${'ab12'.repeat(16)}`;
  }
  const { polls: _polls, ...receipt } = r;
  return receipt;
}

export function createJob(requestId: string): Job & { polls: number; request_id: string } {
  const job = { id: nextId('job'), status: 'queued' as const, result_ref: null, error: null, polls: 0, request_id: requestId };
  state.jobs.set(job.id, job);
  return job;
}

/** Async job simulation: queued → running → done over three polls. */
export function pollJob(id: string): Job | null {
  const j = state.jobs.get(id);
  if (!j) return null;
  j.polls += 1;
  if (j.polls === 1) j.status = 'running';
  if (j.polls >= 3) {
    j.status = 'done';
    j.result_ref = 'https://cdn.example.invalid/songs/demo.mp3';
  }
  return { id: j.id, status: j.status, result_ref: j.result_ref, error: j.error };
}

/* ----------------------------------- seed ----------------------------------- */

function seedChats(): void {
  const c = createChat({ task_type: 'writing' });
  c.title = 'Cover letter for Paystack';
  c.current_model_id = 'openrouter:z-ai/glm-5.3-flash';
  appendMessage(c.id, {
    role: 'user',
    content: 'Write a short cover letter for a payments engineer role at Paystack.',
    attachments: [],
    model_id: null,
    request_id: null,
    result_ref: null,
    tokens: 18,
    status: 'done',
  });
  appendMessage(c.id, {
    role: 'assistant',
    content: "Dear Hiring Team,\n\nI build payment flows people finish…",
    attachments: [],
    model_id: 'openrouter:z-ai/glm-5.3-flash',
    request_id: null,
    result_ref: null,
    tokens: 120,
    status: 'done',
  });
  c.spent = micro(900);
}

seedChats();
