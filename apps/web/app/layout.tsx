import type { Metadata, Viewport } from 'next';

import { fontVariables } from '@/lib/fonts';

import { TestnetBanner } from '@/components/layout/TestnetBanner';

import { Providers } from './providers';

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
        <Providers>
          <TestnetBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
