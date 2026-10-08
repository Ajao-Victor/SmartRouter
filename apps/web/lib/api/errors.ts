/**
 * Error semantics the UI must honour (Technical_Requirements.md §5.4). Maps an `ApiError`
 * (or any thrown value) to one UI action so hooks and components stay consistent.
 */
import { ApiError, isApiError } from '@/lib/api/client';

export type UiErrorAction =
  | { kind: 'sign_in' }
  | { kind: 'top_up' }
  | { kind: 'requote' }
  | { kind: 'cooldown'; seconds: number }
  | { kind: 'free_exhausted' }
  | { kind: 'open_allocation' }
  | { kind: 'offline' }
  | { kind: 'toast'; title: string; description?: string };

export const DEFAULT_COOLDOWN_SECONDS = 10;

export function toUiAction(err: unknown): UiErrorAction {
  if (!isApiError(err)) {
    return { kind: 'toast', title: 'Something went wrong', ...(err instanceof Error ? { description: err.message } : {}) };
  }
  switch (err.code) {
    case 'unauthorized':
      return { kind: 'sign_in' };
    case 'allocation_exceeded':
      return { kind: 'top_up' };
    case 'quote_expired':
      return { kind: 'requote' };
    case 'rate_limited':
      return { kind: 'cooldown', seconds: Math.max(1, Math.round(err.retryAfter ?? DEFAULT_COOLDOWN_SECONDS)) };
    case 'free_quota_exhausted':
      return { kind: 'free_exhausted' };
    case 'session_closed':
      return { kind: 'open_allocation' };
    case 'network':
      return { kind: 'offline' };
    default:
      return { kind: 'toast', title: err.message };
  }
}

export function describeAction(a: UiErrorAction): string {
  switch (a.kind) {
    case 'sign_in':
      return 'Sign in to continue';
    case 'top_up':
      return 'Allocation used — Top up';
    case 'requote':
      return 'Quote expired — getting a fresh one';
    case 'cooldown':
      return `Too many requests — try again in ${String(a.seconds)} s`;
    case 'free_exhausted':
      return 'Free messages for today are used up (30/30)';
    case 'open_allocation':
      return 'Your allocation closed — open a new one';
    case 'offline':
      return 'Could not reach SmartRouter';
    case 'toast':
      return a.title;
  }
}

export { ApiError };
