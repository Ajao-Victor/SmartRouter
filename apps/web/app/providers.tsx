'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { isApiError } from '@/lib/api/client';

import { AuthProvider } from '@/components/auth/AuthProvider';
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
          if (isApiError(err) && (err.code === 'UNAUTHENTICATED' || err.code === 'VALIDATION_FAILED' || err.code === 'FORBIDDEN' || err.code === 'NOT_FOUND')) return false;
          return count < 1;
        },
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0 },
    },
  });
}

/**
 * App-wide providers: TanStack Query, preferences → motion, the toast host. The WebGL field and
 * particle layers belong to the landing page only (`components/landing/LandingFx`); the chat
 * stays plain.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <PreferencesProvider>
        {/* Everything that can call the API sits inside MockProvider so no request escapes
            before the MSW worker is active (LiveRegion reads model labels). */}
        <MockProvider>
          {/* Privy sign-in + the X-Session-Token session (Handover "Sign-in"). */}
          <AuthProvider>
            <div className="relative z-content">{children}</div>
            <WaitlistDialog />
            <LiveRegion />
          </AuthProvider>
        </MockProvider>
        <Toaster />
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
