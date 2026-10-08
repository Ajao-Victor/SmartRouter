import type { ZodType, ZodTypeDef } from 'zod';

import { env } from '@/lib/env';

/**
 * Error codes the UI switches on (Technical_Requirements.md §5.4).
 * The API's own `code` wins when present; otherwise the HTTP status is mapped.
 * Exact status/body shapes are unconfirmed — Backend_Gaps_Report §2.5.
 */
export type ApiErrorCode =
  | 'unauthorized'
  | 'allocation_exceeded'
  | 'quote_expired'
  | 'rate_limited'
  | 'free_quota_exhausted'
  | 'session_closed'
  | 'not_found'
  | 'validation'
  | 'server'
  | 'network'
  | 'invalid_response'
  | 'aborted'
  | 'unknown';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  /** Seconds to wait before retrying (from `Retry-After`), when the API sends it. */
  readonly retryAfter: number | undefined;
  readonly details: unknown;

  constructor(args: {
    status: number;
    code: ApiErrorCode;
    message: string;
    retryAfter?: number | undefined;
    details?: unknown;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.retryAfter = args.retryAfter;
    this.details = args.details;
  }
}

const KNOWN_CODES: ReadonlySet<string> = new Set<ApiErrorCode>([
  'unauthorized',
  'allocation_exceeded',
  'quote_expired',
  'rate_limited',
  'free_quota_exhausted',
  'session_closed',
  'not_found',
  'validation',
  'server',
]);

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 402) return 'allocation_exceeded';
  if (status === 404) return 'not_found';
  if (status === 409) return 'quote_expired';
  if (status === 422 || status === 400) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

interface ErrorBody {
  code?: string;
  message?: string;
  error?: string;
}

function parseErrorBody(text: string): ErrorBody {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* non-JSON body */
  }
  return {};
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const at = Date.parse(header);
  return Number.isFinite(at) ? Math.max(0, Math.round((at - Date.now()) / 1000)) : undefined;
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiRequestOptions<T> {
  method?: HttpMethod;
  /** JSON-serialisable body; sent as `application/json`. */
  body?: unknown;
  /**
   * Validates and types the response. Invalid payloads throw `ApiError('invalid_response')`.
   * `Input = unknown` so `T` is inferred from the schema's *output* (branded micro-USD), not its input.
   */
  schema?: ZodType<T, ZodTypeDef, unknown>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Headers every request carries (security.md §5: cookie auth + CSRF marker). */
export function baseHeaders(extra?: Record<string, string>): Record<string, string> {
  return { 'X-Requested-With': 'smartrouter', Accept: 'application/json', ...extra };
}

export function apiUrl(path: string): string {
  return `${env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Fetch wrapper for the SmartRouter API.
 * - always `credentials: 'include'` (httpOnly session cookie)
 * - JSON in/out
 * - throws `ApiError` with a UI-mappable `code`
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions<T> = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: baseHeaders({
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    }),
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  };

  let response: Response;
  try {
    response = await fetch(apiUrl(path), init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError({ status: 0, code: 'aborted', message: 'Request aborted' });
    }
    throw new ApiError({
      status: 0,
      code: 'network',
      message: 'Could not reach SmartRouter. Check your connection.',
      details: err,
    });
  }

  if (!response.ok) {
    const text = await response.text();
    const body = parseErrorBody(text);
    const code =
      body.code && KNOWN_CODES.has(body.code)
        ? (body.code as ApiErrorCode)
        : codeFromStatus(response.status);
    throw new ApiError({
      status: response.status,
      code,
      message: body.message ?? body.error ?? `Request failed (${String(response.status)})`,
      retryAfter: parseRetryAfter(response.headers.get('Retry-After')),
      details: body,
    });
  }

  if (response.status === 204) return undefined as T;

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    throw new ApiError({
      status: response.status,
      code: 'invalid_response',
      message: 'SmartRouter returned a non-JSON response.',
      details: err,
    });
  }

  if (options.schema) {
    const parsed = options.schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError({
        status: response.status,
        code: 'invalid_response',
        message: 'SmartRouter returned an unexpected payload.',
        details: parsed.error.issues,
      });
    }
    return parsed.data;
  }
  return data as T;
}

/**
 * Open a streaming POST (used by `/run`, SSE over fetch — architecture.md §8).
 * Returns the raw `Response`; the SSE parser (Task 21) reads `response.body`.
 * Non-OK responses are mapped to `ApiError` exactly like `apiFetch`.
 */
export async function apiStream(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: baseHeaders({ 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError({ status: 0, code: 'aborted', message: 'Request aborted' });
    }
    throw new ApiError({
      status: 0,
      code: 'network',
      message: 'Could not reach SmartRouter. Check your connection.',
      details: err,
    });
  }
  if (!response.ok) {
    const text = await response.text();
    const parsed = parseErrorBody(text);
    const code =
      parsed.code && KNOWN_CODES.has(parsed.code)
        ? (parsed.code as ApiErrorCode)
        : codeFromStatus(response.status);
    throw new ApiError({
      status: response.status,
      code,
      message: parsed.message ?? parsed.error ?? `Request failed (${String(response.status)})`,
      retryAfter: parseRetryAfter(response.headers.get('Retry-After')),
      details: parsed,
    });
  }
  return response;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
