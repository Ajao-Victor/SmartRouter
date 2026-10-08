import { webcrypto } from 'node:crypto';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';

import { queryKeys } from '@/lib/api/keys';
import type { ChatWithMessages, QuoteResponse } from '@/lib/api/types';
import { micro } from '@/lib/money';
import { setSessionClientForTests } from '@/lib/tempo/session';
import { MockSessionClient } from '@/lib/tempo/session/impl.mock';

import { useAllocationStore } from '@/stores/allocationStore';
import { useSignerStore } from '@/stores/signerStore';
import { useStreamStore } from '@/stores/streamStore';

import { useRun } from '../useRun';

const start = vi.fn();
vi.mock('@/lib/api/endpoints', () => ({ api: { run: { start: (...a: unknown[]) => start(...a) as Promise<Response> } } }));

function sse(events: string[]): Response {
  const enc = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({ start(c) { for (const e of events) c.enqueue(enc.encode(e)); c.close(); } }));
}
const okStream = () =>
  sse([
    'event: meta\ndata: {"request_id":"r1","model_id":"glm","quote_id":"q1","session_id":"ch"}\n\n',
    'event: token\ndata: {"text":"Hi"}\n\n',
    'event: done\ndata: {"request_id":"r1","price":900,"provider_cost":818,"latency_ms":500,"voucher_amount":900}\n\n',
  ]);

const quote: QuoteResponse = {
  classification: { task_type: 'writing', complexity: 'short', language: 'en', needs_web: false },
  recommendations: [
    { model_id: 'glm', label: 'GLM', provider: 'OpenRouter', price: micro(900), speed_label: 'fast', reason: '', score: 1, quality: 0.8, is_free: false, is_best_quality: false, searches_web: false, quote_id: 'q1' },
    { model_id: 'free', label: 'Free', provider: 'CF', price: micro(0), speed_label: 'fast', reason: '', score: 0, quality: 0.5, is_free: true, is_best_quality: false, searches_web: false, quote_id: null },
  ],
  quote: { id: 'q1', user_id: 'u', chat_id: 'c', model_id: 'glm', prompt_hash: 'h', context_tokens: 1, price: micro(900), est_cost: micro(818), expires_at: new Date(Date.now() + 300_000).toISOString() },
  suggestion: null,
};

let qc: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
const session = (deposit: number, used = 0) => ({
  channel_id: 'ch', user_id: 'u', authorized_signer: 's', deposit: micro(deposit), highest_voucher: micro(used), counted: micro(0), settled: micro(0), last_used_at: null, status: 'open' as const,
});

beforeAll(() => {
  vi.stubGlobal('crypto', webcrypto);
});
afterAll(() => {
  vi.unstubAllGlobals();
});
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData<ChatWithMessages>(queryKeys.chat('c'), { id: 'c', user_id: 'u', title: null, task_type: 'writing', slider: 'balanced', current_model_id: null, summary: null, message_count: 0, spent: micro(0), created_at: '', updated_at: '', messages: [] });
  useAllocationStore.getState().reset();
  useSignerStore.getState().reset();
  useStreamStore.getState().clearAll();
  setSessionClientForTests(new MockSessionClient());
  start.mockReset();
});

describe('useRun', () => {
  it('paid path: signs a cumulative voucher, streams, applies the voucher and records messages', async () => {
    useAllocationStore.getState().hydrateFromSession(session(2_000_000));
    useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(2_000_000) });
    start.mockResolvedValue(okStream());
    const { result } = renderHook(() => useRun('c'), { wrapper });
    let outcome = '';
    await act(async () => {
      outcome = await result.current.run({ prompt: 'Write', quote, modelId: 'glm', autoFreeFallback: true, freeAvailable: true, seq: 0 });
    });
    expect(outcome).toBe('started');
    const body = start.mock.calls[0]?.[0] as { voucher?: { cumulative_amount: number }; prompt: string; quote_id: string };
    expect(body.prompt).toBe('Write');
    expect(body.quote_id).toBe('q1');
    expect(body.voucher?.cumulative_amount).toBe(900);
    expect(useSignerStore.getState().cumulativeMicro).toBe(900);
    expect(useAllocationStore.getState().remainingMicro).toBe(1_999_100);
    const chat = qc.getQueryData<ChatWithMessages>(queryKeys.chat('c'));
    expect(chat?.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(chat?.messages[1]).toMatchObject({ content: 'Hi', status: 'done', request_id: 'r1', model_id: 'glm' });
  });

  it('free path: no voucher is sent', async () => {
    start.mockResolvedValue(okStream());
    const { result } = renderHook(() => useRun('c'), { wrapper });
    await act(async () => {
      await result.current.run({ prompt: 'Hello', quote, modelId: 'free', autoFreeFallback: true, freeAvailable: true, seq: 0 });
    });
    const body = start.mock.calls[0]?.[0] as { voucher?: unknown; model_id: string };
    expect(body.voucher).toBeUndefined();
    expect(body.model_id).toBe('free');
  });

  it('asks for a top-up when the quote exceeds the allocation and fallback is off', async () => {
    useAllocationStore.getState().hydrateFromSession(session(2_000_000, 1_999_500));
    const { result } = renderHook(() => useRun('c'), { wrapper });
    let outcome = '';
    await act(async () => {
      outcome = await result.current.run({ prompt: 'Write', quote, modelId: 'glm', autoFreeFallback: false, freeAvailable: true, seq: 0 });
    });
    expect(outcome).toBe('needs_top_up');
    expect(result.current.needsTopUp?.priceMicro).toBe(900);
    expect(start).not.toHaveBeenCalled();
  });

  it('continues free automatically when fallback is on', async () => {
    useAllocationStore.getState().hydrateFromSession(session(2_000_000, 1_999_500));
    start.mockResolvedValue(okStream());
    const { result } = renderHook(() => useRun('c'), { wrapper });
    await act(async () => {
      await result.current.run({ prompt: 'Write', quote, modelId: 'glm', autoFreeFallback: true, freeAvailable: true, seq: 0 });
    });
    const body = start.mock.calls[0]?.[0] as { model_id: string; voucher?: unknown };
    expect(body.model_id).toBe('free');
    expect(body.voucher).toBeUndefined();
  });

  it('restores the voucher when no result is delivered', async () => {
    useAllocationStore.getState().hydrateFromSession(session(2_000_000));
    useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(2_000_000) });
    start.mockResolvedValue(sse(['event: error\ndata: {"code":"provider_failed","message":"twice","can_rerun_free":true}\n\n']));
    const { result } = renderHook(() => useRun('c'), { wrapper });
    await act(async () => {
      await result.current.run({ prompt: 'Write', quote, modelId: 'glm', autoFreeFallback: false, freeAvailable: true, seq: 0 });
    });
    expect(useSignerStore.getState().cumulativeMicro).toBe(0);
    expect(useAllocationStore.getState().remainingMicro).toBe(2_000_000);
    const entry = Object.values(useStreamStore.getState().byMessageId)[0];
    expect(entry?.status).toBe('error');
    expect(entry?.error?.canRerunFree).toBe(true);
  });
});

describe('useRun compare', () => {
  it('runs two models in parallel with two vouchers and one user message', async () => {
    useAllocationStore.getState().hydrateFromSession(session(2_000_000));
    useSignerStore.getState().setSigner({ publicKey: 'pk', channelId: 'ch', depositMicro: micro(2_000_000) });
    const compareQuote: QuoteResponse = {
      ...quote,
      recommendations: [
        ...quote.recommendations,
        { model_id: 'opus', label: 'Opus', provider: 'Anthropic', price: micro(28_600), speed_label: 'steady', reason: '', score: 0.7, quality: 1, is_free: false, is_best_quality: true, searches_web: false, quote_id: 'q2' },
      ],
    };
    start.mockImplementation(() => Promise.resolve(okStream()));
    const { result } = renderHook(() => useRun('c'), { wrapper });
    let outcome = '';
    await act(async () => {
      outcome = await result.current.runCompare({ prompt: 'Write', quote: compareQuote, leftModelId: 'glm', rightModelId: 'opus', seq: 0 });
    });
    expect(outcome).toBe('started');
    expect(start).toHaveBeenCalledTimes(2);
    const bodies = start.mock.calls.map((c) => c[0] as { model_id: string; voucher?: { cumulative_amount: number } });
    expect(bodies.map((b) => b.model_id).sort()).toEqual(['glm', 'opus']);
    expect(bodies.map((b) => b.voucher?.cumulative_amount).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([900, 29_500]);
    expect(useSignerStore.getState().cumulativeMicro).toBe(29_500);
    const chat = qc.getQueryData<ChatWithMessages>(queryKeys.chat('c'));
    expect(chat?.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'assistant']);
    expect(result.current.compare?.leftModelId).toBe('glm');
  });
});
