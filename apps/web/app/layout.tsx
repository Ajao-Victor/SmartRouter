import type { Metadata, Viewport } from 'next';

import { fontVariables } from '@/lib/fonts';

import { GlowTrailLayer } from '@/components/fx/GlowTrail';
import { ParticleLayer } from '@/components/fx/ParticleBurst';
import { RouterField } from '@/components/fx/RouterField';
import { PreferencesProvider } from '@/components/layout/PreferencesProvider';
import { Toaster } from '@/components/ui/Toast';

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
        <PreferencesProvider>
          <RouterField />
          <div className="relative z-content">{children}</div>
          <GlowTrailLayer />
          <ParticleLayer />
          <Toaster />
        </PreferencesProvider>
      </body>
    </html>
  );
}
