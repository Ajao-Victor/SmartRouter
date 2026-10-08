import { parseFrames, runStream, WATCHDOG_MS } from '../sse';

const start = vi.fn<(body: unknown, signal?: AbortSignal) => Promise<Response>>();
vi.mock('@/lib/api/endpoints', () => ({ api: { run: { start: (body: unknown, signal?: AbortSignal) => start(body, signal) } } }));

/** A stream that never closes but errors when the fetch signal aborts (like a real fetch). */
function neverStream(signal?: AbortSignal): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        signal?.addEventListener('abort', () => {
          c.error(new DOMException('The operation was aborted.', 'AbortError'));
        });
      },
    }),
  );
}

function streamOf(chunks: string[], delayMs = 0): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(c) {
      for (const ch of chunks) {
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        c.enqueue(enc.encode(ch));
      }
      c.close();
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
}

const body = { quote_id: 'q', chat_id: 'c', model_id: 'm', prompt: 'hi' };

describe('parseFrames', () => {
  it('splits complete frames and keeps the partial tail', () => {
    const { frames, rest } = parseFrames('event: token\ndata: {"text":"a"}\n\nevent: hea');
    expect(frames).toEqual([{ event: 'token', data: '{"text":"a"}' }]);
    expect(rest).toBe('event: hea');
  });
});

describe('runStream', () => {
  it('dispatches every event type and resolves on done', async () => {
    start.mockResolvedValue(
      streamOf([
        'event: meta\ndata: {"request_id":"r1","model_id":"m","quote_id":"q","session_id":"s"}\n\n',
        'event: token\ndata: {"text":"Hel"}\n\nevent: tok',
        'en\ndata: {"text":"lo"}\n\nevent: heartbeat\ndata: {}\n\n',
        'event: retry\ndata: {"from_model_id":"m","to_model_id":"m2","reason":"timeout"}\n\n',
        'event: file\ndata: {"url":"https://x.y/a.png","mime":"image/png"}\n\nevent: job\ndata: {"job_id":"j1"}\n\n',
        'event: done\ndata: {"request_id":"r1","price":900,"provider_cost":818,"latency_ms":1200,"voucher_amount":900}\n\n',
      ]),
    );
    const h = { onMeta: vi.fn(), onToken: vi.fn(), onHeartbeat: vi.fn(), onRetry: vi.fn(), onFile: vi.fn(), onJob: vi.fn(), onDone: vi.fn(), onError: vi.fn() };
    const out = await runStream(body, h);
    expect(out.kind).toBe('done');
    expect(h.onMeta).toHaveBeenCalledWith(expect.objectContaining({ request_id: 'r1' }));
    expect(h.onToken.mock.calls.map((c) => c[0])).toEqual(['Hel', 'lo']);
    expect(h.onHeartbeat).toHaveBeenCalledTimes(1);
    expect(h.onRetry).toHaveBeenCalledWith(expect.objectContaining({ to_model_id: 'm2' }));
    expect(h.onFile).toHaveBeenCalledWith({ url: 'https://x.y/a.png', mime: 'image/png' });
    expect(h.onJob).toHaveBeenCalledWith('j1');
    expect(h.onDone).toHaveBeenCalledWith(expect.objectContaining({ price: 900 }));
    expect(h.onError).not.toHaveBeenCalled();
  });

  it('surfaces error events with the rerun-free flag', async () => {
    start.mockResolvedValue(streamOf(['event: error\ndata: {"code":"provider_failed","message":"twice","can_rerun_free":true}\n\n']));
    const onError = vi.fn();
    const out = await runStream(body, { onError });
    expect(out).toEqual({ kind: 'error', data: { code: 'provider_failed', message: 'twice', can_rerun_free: true } });
    expect(onError).toHaveBeenCalled();
  });

  it('times out after 45 s of silence', async () => {
    vi.useFakeTimers();
    start.mockImplementation((_b, signal) => Promise.resolve(neverStream(signal)));
    const p = runStream(body, {});
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS + 10);
    const out = await p;
    vi.useRealTimers();
    expect(out.kind).toBe('error');
    expect((out as { data: { code: string } }).data.code).toBe('timeout');
  });

  it('reports abort when the caller cancels', async () => {
    start.mockImplementation((_b, signal) => Promise.resolve(neverStream(signal)));
    const ac = new AbortController();
    const p = runStream(body, {}, ac.signal);
    ac.abort();
    expect((await p).kind).toBe('aborted');
  });
});
