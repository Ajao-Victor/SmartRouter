import { isMockTempo } from '@/lib/tempo/mock';

import { MockSessionClient } from './impl.mock';
import type { SessionClient } from './SessionClient';

let instance: SessionClient | null = null;

/** Session client: mock on testnet/mock; mainnet warns loudly until the real client is wired. */
export function getSessionClient(): SessionClient {
  if (instance) return instance;
  if (!isMockTempo()) {
     
    console.warn('[tempo] Real session client not wired (Backend_Gaps_Report §3.1); using mock.');
  }
  instance = new MockSessionClient();
  return instance;
}

export function setSessionClientForTests(client: SessionClient | null): void {
  instance = client;
}

export type { SessionClient } from './SessionClient';
