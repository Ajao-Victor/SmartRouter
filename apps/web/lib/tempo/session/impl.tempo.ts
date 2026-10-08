import type { SessionClient } from './SessionClient';

/**
 * Real Tempo/MPP session client — NOT WIRED (Backend_Gaps_Report §3.1).
 * Replace the body with the confirmed browser package once the API team answers.
 */
export function createTempoSessionClient(): SessionClient {
  const notWired = () => Promise.reject(new Error('Tempo session client is not wired yet (Backend_Gaps_Report §3.1)'));
  return {
    openChannel: notWired,
    topUp: notWired,
    signVoucher: notWired,
    status: notWired,
  };
}
