import { z } from 'zod';

import { ApiError, apiFetch, apiStream, isApiError } from './client';

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn(impl);
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('sends credentials, CSRF marker and JSON body to the API base URL', async () => {
    const spy = mockFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    await apiFetch('/api/me/settings', { method: 'PATCH', body: { slider: 'cheapest' } });

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8787/api/me/settings');
    expect(init.credentials).toBe('include');
    expect(init.method).toBe('PATCH');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Requested-With']).toBe('smartrouter');
    expect(headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ slider: 'cheapest' }));
  });

  it('validates the response with a schema', async () => {
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({ nonce: 'abcdefgh' }), { status: 200 })));
    const data = await apiFetch('/api/auth/nonce', { schema: z.object({ nonce: z.string() }) });
    expect(data.nonce).toBe('abcdefgh');
  });

  it('throws invalid_response when the schema fails', async () => {
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({ nope: 1 }), { status: 200 })));
    await expect(
      apiFetch('/api/auth/nonce', { schema: z.object({ nonce: z.string() }) }),
    ).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('maps 429 to rate_limited with Retry-After', async () => {
    mockFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: 'slow down' }), {
          status: 429,
          headers: { 'Retry-After': '12' },
        }),
      ),
    );
    const err = await apiFetch('/api/chats').catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    const apiErr = err as ApiError;
    expect(apiErr.code).toBe('rate_limited');
    expect(apiErr.retryAfter).toBe(12);
    expect(apiErr.message).toBe('slow down');
  });

  it('prefers the API body code over the status mapping', async () => {
    mockFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ code: 'free_quota_exhausted', message: '30/30 used' }), {
          status: 402,
        }),
      ),
    );
    await expect(apiFetch('/run')).rejects.toMatchObject({ code: 'free_quota_exhausted' });
  });

  it('maps 401 / 402 / 409 / 5xx by status', async () => {
    for (const [status, code] of [
      [401, 'unauthorized'],
      [402, 'allocation_exceeded'],
      [409, 'quote_expired'],
      [503, 'server'],
    ] as const) {
      mockFetch(() => Promise.resolve(new Response('oops', { status })));
      await expect(apiFetch('/x')).rejects.toMatchObject({ code, status });
    }
  });

  it('maps network failures', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(apiFetch('/x')).rejects.toMatchObject({ code: 'network', status: 0 });
  });

  it('returns undefined for 204', async () => {
    mockFetch(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(apiFetch('/api/feedback', { method: 'POST', body: {} })).resolves.toBeUndefined();
  });
});

describe('apiStream', () => {
  it('posts with event-stream accept header and returns the raw response', async () => {
    const spy = mockFetch(() => Promise.resolve(new Response('data: {}\n\n', { status: 200 })));
    const res = await apiStream('/run', { chat_id: 'c1' });
    expect(res.ok).toBe(true);
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Accept).toBe('text/event-stream');
    expect(init.credentials).toBe('include');
  });

  it('maps non-OK stream responses to ApiError', async () => {
    mockFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 'quote_expired' }), { status: 409 })),
    );
    await expect(apiStream('/run', {})).rejects.toMatchObject({ code: 'quote_expired' });
  });
});
