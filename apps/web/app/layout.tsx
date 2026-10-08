import type { Metadata, Viewport } from 'next';

import { fontVariables } from '@/lib/fonts';

import { PreferencesProvider } from '@/components/layout/PreferencesProvider';

import './globals.css';

export const metadata: Metadata = {
  title: 'SmartRouter',
  description:
    'Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere.',
};

export const viewport: Viewport = {
  themeColor: '#05060A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className={fontVariables}>
      <body>
        {/* WebGL-free router field; RouterField (R3F) replaces it in Task 7 when capable. */}
        <div className="bg-field-fallback pointer-events-none fixed inset-0 z-field" aria-hidden="true" />
        <div className="bg-grid-field pointer-events-none fixed inset-0 z-field" aria-hidden="true" />
        <div className="bg-noise pointer-events-none fixed inset-0 z-field" aria-hidden="true" />
        <PreferencesProvider>
          <div className="relative z-content">{children}</div>
        </PreferencesProvider>
      </body>
    </html>
  );
}
