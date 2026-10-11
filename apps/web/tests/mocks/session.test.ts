import { micro } from '@/lib/money';
import { topUpSession, closeSession } from '@/lib/tempo/session';

import { server } from './server';
import { resetMockState, state } from './state';

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

describe('mock-mode session calls', () => {
  it('top-up and close go to the MSW stand-ins', async () => {
    await topUpSession(micro(2_000_000));
    expect(state.session?.depositUsd).toBe(2);
    await closeSession();
    expect(state.session).toBeNull();
  });
});
