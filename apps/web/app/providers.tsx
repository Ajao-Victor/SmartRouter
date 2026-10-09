'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';

import { GlowTrailLayer } from '@/components/fx/GlowTrail';
import { ParticleLayer } from '@/components/fx/ParticleBurst';
import { RouterField } from '@/components/fx/RouterField';
import { LiveRegion } from '@/components/layout/LiveRegion';
import { MockProvider } from '@/components/layout/MockProvider';
import { PreferencesProvider } from '@/components/layout/PreferencesProvider';
import { Toaster } from '@/components/ui/Toast';
import { WaitlistDialog } from '@/components/wallet/WaitlistDialog';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, err) => {
          if (isApiError(err) && (err.code === 'unauthorized' || err.code === 'validation')) return false;
          return count < 1;
        },
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0 },
    },
  });
}

/**
 * App-wide providers (architecture.md §4): TanStack Query, preferences → motion,
 * the WebGL/CSS field, FX singleton layers and the toast host.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <PreferencesProvider>
        <RouterField />
        {/* Everything that can call the API sits inside MockProvider so no request escapes
            before the MSW worker is active (LiveRegion reads model labels). */}
        <MockProvider>
          <div className="relative z-content">{children}</div>
          <WaitlistDialog />
          <LiveRegion />
        </MockProvider>
        <GlowTrailLayer />
        <ParticleLayer />
        <Toaster />
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
