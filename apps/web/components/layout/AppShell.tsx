'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { apiUnreachableHint } from '@/lib/api/errors';

import { useAuth } from '@/hooks/useAuth';
import { useCloseSession } from '@/hooks/useCloseSession';
import { useMe } from '@/hooks/useMe';
import { useSession } from '@/hooks/useSession';
import { useSettings } from '@/hooks/useSettings';
import { useTopUp } from '@/hooks/useTopUp';
import { useAllocationStore } from '@/stores/allocationStore';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

import { AllocationHUD } from '@/components/allocation/AllocationHUD';
import { TopBar } from '@/components/layout/TopBar';
import { ReceiptDrawer } from '@/components/receipt/ReceiptDrawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { WalletSheet } from '@/components/wallet/WalletSheet';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string | null;
}

/**
 * Signed-in shell: `GET /me` on load (401 → landing), the wallet restored silently from the
 * stored passkey, `/sessions/current` mirrored into the allocation store, wallet sheet and
 * receipt drawer mounted once.
 */
export function AppShell({ children, title }: AppShellProps) {
  const router = useRouter();
  const me = useMe();
  const settings = useSettings();
  const auth = useAuth();
  const topUp = useTopUp();
  const closeSession = useCloseSession();
  const pageTitle = useUiStore((s) => s.pageTitle);
  const suggestedDeposit = useAllocationStore((s) => s.suggestedDepositUsd);
  useSession(Boolean(me.data));

  const restore = auth.restore;
  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (me.isUnauthenticated) router.replace('/');
  }, [me.isUnauthenticated, router]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg-0">
      <TopBar title={title ?? pageTitle} right={me.data ? <AllocationHUD /> : null} />
      {me.data && (
        <WalletSheet
          user={me.data}
          busy={{ topUp: topUp.isPending, close: closeSession.isPending, settings: settings.isPending, signOut: auth.signOut.isPending }}
          onTopUp={() => {
            topUp.mutate(suggestedDeposit);
          }}
          onCloseSession={() => {
            closeSession.mutate();
          }}
          onSettings={(patch) => {
            settings.mutate(patch, {
              onError: () => {
                toast.error('Could not save settings');
              },
            });
          }}
          onSignOut={() => {
            auth.signOut.mutate(undefined, {
              onSettled: () => {
                window.location.assign('/');
              },
            });
          }}
        />
      )}
      <ReceiptDrawer />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-4">
        {me.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-6 w-40" pill />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : me.isOffline ? (
          <div role="alert" className="space-y-2 rounded-lg bg-bg-1 p-4 text-sm shadow-hairline">
            <p className="text-signal">Could not reach SmartRouter.</p>
            <p className="text-text-2">{apiUnreachableHint()}</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
