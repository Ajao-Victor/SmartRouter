import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';
import { resetMockState } from './state';

/**
 * Browser worker for `NEXT_PUBLIC_MOCK=1`. Starts signed out with no payment session so the
 * PDF demo path (sign in → describe → pick → run → top-up → receipt) is walked end to end.
 */
resetMockState({ authed: false, session: null });

export const worker = setupWorker(...handlers);
