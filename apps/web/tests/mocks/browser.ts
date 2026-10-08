import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';
import { resetMockState } from './state';

/**
 * Browser worker for `NEXT_PUBLIC_MOCK=1`. Starts with **no open allocation** so the PDF demo
 * path (deposit → open allocation → task → run → top-up → receipt) is walked end to end and the
 * browser always holds the voucher signer for the session it uses. (Vitest keeps the seeded open
 * session so handler tests can exercise vouchers directly.)
 */
resetMockState({ session: null });

export const worker = setupWorker(...handlers);
