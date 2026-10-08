import { mockSessionOpen } from './fixtures';
import { server } from './server';
import { resetMockState, state } from './state';

const API = 'http://localhost:8787';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  resetMockState();
});
afterAll(() => {
  server.close();
});

async function readSse(res: Response): Promise<{ event: string; data: unknown }[]> {
  const text = await res.text();
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const ev = /event: (.*)/.exec(block)?.[1] ?? '';
      const data = /data: (.*)/.exec(block)?.[1] ?? '{}';
      return { event: ev, data: JSON.parse(data) as unknown };
    });
}

describe('mock API', () => {
  it('quotes a writing prompt with four options and attribution-ready reasons', async () => {
    const chat = (await (await fetch(`${API}/api/chats`, { method: 'POST', body: JSON.stringify({ first_prompt: 'Write a cover letter' }) })).json()) as { id: string };
    const res = await fetch(`${API}/api/chats/${chat.id}/quote`, { method: 'POST', body: JSON.stringify({ prompt: 'Write a cover letter', slider: 'balanced' }) });
    const q = (await res.json()) as { classification: { task_type: string }; recommendations: { is_free: boolean; is_best_quality: boolean; reason: string; price: number }[]; quote: { price: number; expires_at: string } };
    expect(q.classification.task_type).toBe('writing');
    expect(q.recommendations).toHaveLength(4);
    expect(q.recommendations.filter((r) => r.is_free)).toHaveLength(1);
    expect(q.recommendations.filter((r) => r.is_best_quality)).toHaveLength(1);
    expect(q.recommendations[0]?.reason).toMatch(/% of the best quality at 1\/\d+ of the price/);
    expect(q.quote.price % 100).toBe(0);
    expect(Date.parse(q.quote.expires_at) - Date.now()).toBeGreaterThan(4 * 60_000);
  });

  it('streams a paid run, records the voucher and settles on later polls', async () => {
    const chat = (await (await fetch(`${API}/api/chats`, { method: 'POST', body: JSON.stringify({ first_prompt: 'Write a cover letter' }) })).json()) as { id: string };
    await fetch(`${API}/api/chats/${chat.id}/quote`, { method: 'POST', body: JSON.stringify({ prompt: 'Write a cover letter' }) });
    const q = (await (await fetch(`${API}/api/chats/${chat.id}/quote`, { method: 'POST', body: JSON.stringify({ prompt: 'Write a cover letter' }) })).json()) as { quote: { id: string; model_id: string; price: number } };
    const res = await fetch(`${API}/run`, {
      method: 'POST',
      body: JSON.stringify({ quote_id: q.quote.id, chat_id: chat.id, model_id: q.quote.model_id, voucher: { channel_id: 'ch_demo_0001', cumulative_amount: q.quote.price, signature: '0xsig' } }),
    });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const events = await readSse(res);
    expect(events[0]?.event).toBe('meta');
    expect(events.some((e) => e.event === 'token')).toBe(true);
    expect(events.some((e) => e.event === 'heartbeat')).toBe(true);
    const done = events.at(-1);
    expect(done?.event).toBe('done');
    const { request_id } = done?.data as { request_id: string };
    expect(state.session?.highest_voucher).toBe(q.quote.price);
    const first = (await (await fetch(`${API}/api/requests/${request_id}`)).json()) as { tx_hash: string | null };
    expect(first.tx_hash).toBeNull();
    const second = (await (await fetch(`${API}/api/requests/${request_id}`)).json()) as { tx_hash: string | null };
    expect(second.tx_hash).toMatch(/^0x[0-9a-f]{64}$/);
  }, 15_000);

  it('rejects over-allocation and exhausted free quota per the PDF rules', async () => {
    const open = mockSessionOpen();
    resetMockState({ session: { ...open, highest_voucher: open.deposit }, freeMessages: 30 });
    const chat = (await (await fetch(`${API}/api/chats`, { method: 'POST', body: JSON.stringify({ first_prompt: 'hello' }) })).json()) as { id: string };
    const q = (await (await fetch(`${API}/api/chats/${chat.id}/quote`, { method: 'POST', body: JSON.stringify({ prompt: 'hello' }) })).json()) as { quote: { id: string; model_id: string; price: number } };
    const paid = await fetch(`${API}/run`, { method: 'POST', body: JSON.stringify({ quote_id: q.quote.id, chat_id: chat.id, model_id: q.quote.model_id, voucher: { channel_id: 'x', cumulative_amount: 1, signature: 's' } }) });
    expect(paid.status).toBe(402);
    expect(((await paid.json()) as { code: string }).code).toBe('allocation_exceeded');
    const free = await fetch(`${API}/run`, { method: 'POST', body: JSON.stringify({ quote_id: null, chat_id: chat.id, model_id: 'cloudflare:llama-3.1-8b' }) });
    expect(free.status).toBe(402);
    expect(((await free.json()) as { code: string }).code).toBe('free_quota_exhausted');
  });

  it('runs the retry and fail scenarios', async () => {
    const chat = (await (await fetch(`${API}/api/chats`, { method: 'POST', body: JSON.stringify({ first_prompt: 'Write a poem [retry]' }) })).json()) as { id: string };
    const q = (await (await fetch(`${API}/api/chats/${chat.id}/quote`, { method: 'POST', body: JSON.stringify({ prompt: 'Write a poem [retry]' }) })).json()) as { quote: { id: string; model_id: string; price: number } };
    const res = await fetch(`${API}/run`, { method: 'POST', body: JSON.stringify({ quote_id: q.quote.id, chat_id: chat.id, model_id: q.quote.model_id, prompt: 'Write a poem [retry]', voucher: { channel_id: 'ch_demo_0001', cumulative_amount: q.quote.price, signature: 's' } }) });
    const events = await readSse(res);
    expect(events.some((e) => e.event === 'retry')).toBe(true);
    expect(state.messages.get(chat.id)?.some((m) => m.role === 'user' && m.content === 'Write a poem [retry]')).toBe(true);
  }, 15_000);

  it('gates authed routes', async () => {
    resetMockState({ authed: false });
    expect((await fetch(`${API}/api/me`)).status).toBe(401);
    await fetch(`${API}/api/auth/verify`, { method: 'POST', body: JSON.stringify({ message: 'm', signature: 's', kind: 'passkey' }) });
    expect((await fetch(`${API}/api/me`)).status).toBe(200);
  });
});
