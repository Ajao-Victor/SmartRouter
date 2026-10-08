import { ApiError } from '../client';
import { describeAction, toUiAction } from '../errors';

const err = (code: ApiError['code'], retryAfter?: number) => new ApiError({ status: 400, code, message: 'm', ...(retryAfter !== undefined ? { retryAfter } : {}) });

describe('error semantics (Technical_Requirements §5.4)', () => {
  it('maps every API code to the required UI action', () => {
    expect(toUiAction(err('unauthorized'))).toEqual({ kind: 'sign_in' });
    expect(toUiAction(err('allocation_exceeded'))).toEqual({ kind: 'top_up' });
    expect(toUiAction(err('quote_expired'))).toEqual({ kind: 'requote' });
    expect(toUiAction(err('rate_limited', 12))).toEqual({ kind: 'cooldown', seconds: 12 });
    expect(toUiAction(err('rate_limited'))).toEqual({ kind: 'cooldown', seconds: 10 });
    expect(toUiAction(err('free_quota_exhausted'))).toEqual({ kind: 'free_exhausted' });
    expect(toUiAction(err('session_closed'))).toEqual({ kind: 'open_allocation' });
    expect(toUiAction(err('network'))).toEqual({ kind: 'offline' });
    expect(toUiAction(new Error('boom'))).toEqual({ kind: 'toast', title: 'Something went wrong', description: 'boom' });
  });

  it('describes actions with the PDF copy', () => {
    expect(describeAction({ kind: 'top_up' })).toBe('Allocation used — Top up');
    expect(describeAction({ kind: 'free_exhausted' })).toBe('Free messages for today are used up (30/30)');
    expect(describeAction({ kind: 'cooldown', seconds: 3 })).toContain('3 s');
  });
});
