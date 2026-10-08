import type { NextConfig } from 'next';

/**
 * Content Security Policy — see security.md §4.
 * The browser talks only to the SmartRouter API, Tempo (via the SDK) and Sentry.
 * Provider MPP hosts are never allowed here and never appear in this bundle
 * (enforced by `pnpm guard:hosts`).
 */
const isDev = process.env.NODE_ENV !== 'production';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';
const objectStorageHost = process.env.NEXT_PUBLIC_OBJECT_STORAGE_HOST ?? '';
// GAP (Backend_Gaps_Report §8): Tempo SDK origins for connect-src / frame-src are unconfirmed.
const tempoOrigins = (process.env.NEXT_PUBLIC_TEMPO_ORIGINS ?? '').split(',').filter(Boolean);

const sentryOrigin = (() => {
  try {
    return sentryDsn ? new URL(sentryDsn).origin : '';
  } catch {
    return '';
  }
})();

const connectSrc = ["'self'", apiUrl, sentryOrigin, ...tempoOrigins].filter(Boolean).join(' ');
const frameSrc = ["'self'", ...tempoOrigins].filter(Boolean).join(' ');
const mediaSrc = ["'self'", 'blob:', objectStorageHost ? `https://${objectStorageHost}` : '']
  .filter(Boolean)
  .join(' ');
const imgSrc = ["'self'", 'data:', 'blob:', objectStorageHost ? `https://${objectStorageHost}` : '']
  .filter(Boolean)
  .join(' ');

const csp = [
  `default-src 'self'`,
  // three.js needs wasm-unsafe-eval; Next dev needs unsafe-eval/unsafe-inline for HMR.
  `script-src 'self' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : " 'unsafe-inline'"}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com data:`,
  `img-src ${imgSrc}`,
  `media-src ${mediaSrc}`,
  `connect-src ${connectSrc}${isDev ? ' ws: wss:' : ''}`,
  `frame-src ${frameSrc}`,
  `worker-src 'self' blob:`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: objectStorageHost
      ? [{ protocol: 'https', hostname: objectStorageHost }]
      : [],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
