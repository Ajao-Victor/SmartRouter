import { closeSession, paidFetch } from '@/lib/tempo/session';

import { server } from './server';
import { openSession, resetMockState, state } from './state';

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
  it('close goes to the MSW stand-in (no top-up in v1: close, then a new deposit)', async () => {
    openSession(2);
    expect(state.session?.depositUsd).toBe(2);
    await closeSession();
    expect(state.session).toBeNull();
  });

  it('paid runs go through the API helper on mocks', async () => {
    const res = await paidFetch('/sessions/current');
    expect(res.ok).toBe(true);
  });
});
