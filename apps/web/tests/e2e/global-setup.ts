import type { FullConfig } from '@playwright/test';

/**
 * Warm the dev server before the demo spec runs. `next dev` compiles each route on first
 * request (landing ≈ 35 s, chat ≈ 11 s, chat/[id] ≈ 21 s on a laptop), which otherwise lands
 * inside the test's own timeout and makes the first run flaky. Fetching the routes once here
 * moves that cost out of the tests; it is a no-op against a warm or production server.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3100';
  const routes = ['/', '/chat', '/chat/chat_0001', '/settings', '/receipts/req_warmup'];
  for (const route of routes) {
    try {
      await fetch(new URL(route, baseURL), { headers: { accept: 'text/html' } });
    } catch {
      // The webServer check already proved the server is up; a failed warm-up only costs time.
    }
  }
}
