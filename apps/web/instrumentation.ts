/** Next.js instrumentation hook: loads the Sentry server config per runtime. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.server.config');
  }
}
