import { z } from 'zod';

import { ApiError, apiFetch, isApiError } from './client';

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn(impl);
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch (PDF "Data fetching")', () => {
  it('sends credentials and a JSON body straight to the API base URL (no /api prefix, no rewrite)', async () => {
    const spy = mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    await apiFetch('/me/settings', { method: 'PATCH', body: { slider: 'cheapest' } });

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8787/me/settings');
    expect(init.credentials).toBe('include');
    expect(init.method).toBe('PATCH');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Accept).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ slider: 'cheapest' }));
  });

  it('validates the response with a schema', async () => {
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({ message: 'sign me' }), { status: 200 })));
    const data = await apiFetch('/auth/challenge', { schema: z.object({ message: z.string() }) });
    expect(data.message).toBe('sign me');
  });

  it('throws INVALID_RESPONSE when the schema fails', async () => {
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({ nope: 1 }), { status: 200 })));
    await expect(apiFetch('/auth/challenge', { schema: z.object({ message: z.string() }) })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('maps 429 to RATE_LIMITED with Retry-After', async () => {
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({ code: 'RATE_LIMITED', message: 'slow down' }), { status: 429, headers: { 'Retry-After': '12' } })));
    const err = await apiFetch('/chats').catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    const apiErr = err as ApiError;
    expect(apiErr.code).toBe('RATE_LIMITED');
    expect(apiErr.retryAfter).toBe(12);
    expect(apiErr.message).toBe('slow down');
  });

  it('prefers the body code over the status and keeps details', async () => {
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({ code: 'ALLOCATION_EXHAUSTED', message: 'used up', details: { freeFallback: { available: true } } }), { status: 402 })));
    await expect(apiFetch('/run')).rejects.toMatchObject({ code: 'ALLOCATION_EXHAUSTED', details: { freeFallback: { available: true } } });
  });

  it('falls back to the status when a response carries no code', async () => {
    for (const [status, code] of [
      [401, 'UNAUTHENTICATED'],
      [402, 'PAYMENT_REQUIRED'],
      [403, 'FORBIDDEN'],
      [404, 'NOT_FOUND'],
      [409, 'QUOTE_USED'],
      [410, 'QUOTE_EXPIRED'],
      [503, 'PROVIDER_UNAVAILABLE'],
      [500, 'INTERNAL'],
    ] as const) {
      mockFetch(() => Promise.resolve(new Response('oops', { status })));
      await expect(apiFetch('/x')).rejects.toMatchObject({ code, status });
    }
  });

  it('maps network failures', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(apiFetch('/x')).rejects.toMatchObject({ code: 'NETWORK', status: 0 });
  });

  it('returns undefined for 204', async () => {
    mockFetch(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(apiFetch('/feedback', { method: 'POST', body: {} })).resolves.toBeUndefined();
  });
});
