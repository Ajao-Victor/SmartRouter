/**
 * Map mppx client-side errors (thrown before any request is sent) to PDF semantics:
 * "exceeds local maxDeposit" → ALLOCATION_EXHAUSTED, "already in flight" → SESSION_BUSY,
 * wallet rejection → PAYMENT_CANCELLED (nothing was charged). Pure, so it ships in the main
 * bundle while `session.ts` (mppx) stays lazy.
 */
import { ApiError } from '@/lib/api/client';

export function toPaymentError(err: unknown): ApiError | null {
  if (err instanceof ApiError) return err;
  if (!(err instanceof Error)) return null;
  const m = err.message;
  // Handover: the deposit can run out before the banner says 100% — mppx refuses before sending
  // anything. Treat it as exhausted: keep the message, open the deposit dialog, resend after.
  if (/exceeds local maxDeposit/i.test(m)) return new ApiError({ status: 402, code: 'ALLOCATION_EXHAUSTED', message: "Your deposit can't cover this message.", details: { reason: 'deposit', cause: err } });
  if (/already in flight/i.test(m)) return new ApiError({ status: 0, code: 'SESSION_BUSY', message: 'A payment is already in progress. Try again in a moment.', details: err });
  if (/reject|cancel|denied|abort|not allowed|NotAllowedError/i.test(m) || err.name === 'NotAllowedError') {
    return new ApiError({ status: 0, code: 'PAYMENT_CANCELLED', message: 'Payment cancelled — nothing was charged.', details: err });
  }
  if (/insufficient|balance/i.test(m)) return new ApiError({ status: 402, code: 'PAYMENT_REQUIRED', message: 'Your wallet balance is too low to open the session. Fund it first.', details: err });
  return null;
}
