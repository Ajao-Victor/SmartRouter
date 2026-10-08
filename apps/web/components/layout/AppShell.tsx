'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useMe } from '@/hooks/useMe';

import { TopBar } from '@/components/layout/TopBar';
import { Skeleton } from '@/components/ui/Skeleton';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string | null;
  right?: React.ReactNode;
}

/**
 * Authed shell (architecture.md §4): redirects to `/` on 401, shows a skeleton while
 * `/api/me` loads, keeps the backdrop mounted across routes, pads for the floating dock.
 */
export function AppShell({ children, title, right }: AppShellProps) {
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    if (me.isUnauthenticated) router.replace('/');
  }, [me.isUnauthenticated, router]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar {...(title !== undefined ? { title } : {})} {...(right !== undefined ? { right } : {})} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-32">
        {me.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-6 w-40" pill />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : me.isOffline ? (
          <p role="alert" className="glass rounded-lg p-4 text-sm text-signal">
            Could not reach SmartRouter. Check your connection and try again.
          </p>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
