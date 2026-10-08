'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { micro } from '@/lib/money';


import { useAuth } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import { useSession } from '@/hooks/useSession';
import { useSettings } from '@/hooks/useSettings';
import { toast } from '@/stores/toastStore';

import { AllocationHUD } from '@/components/allocation/AllocationHUD';
import { TopBar } from '@/components/layout/TopBar';
import { ReceiptDrawer } from '@/components/receipt/ReceiptDrawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { WalletSheet } from '@/components/wallet/WalletSheet';

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
  const settings = useSettings();
  const auth = useAuth();
  useSession(Boolean(me.data));

  useEffect(() => {
    void auth.restore();
  }, [auth.restore]);

  useEffect(() => {
    if (me.isUnauthenticated) router.replace('/');
  }, [me.isUnauthenticated, router]);

  // Tempo SDK wiring (deposit, swap, spend permission, open/top-up) lands in Tasks 19–20.
  const notYet = (what: string) => () => {
    toast.info(`${what} arrives with the Tempo SDK wiring`, 'Tasks 19–20');
  };
  const allocation = me.data?.allocation ?? micro(2_000_000);
  const hud = <AllocationHUD allocationMicro={allocation} onTopUp={notYet('Top up')} onOpenAllocation={notYet('Open allocation')} />;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar {...(title !== undefined ? { title } : {})} right={right ?? (me.data ? hud : null)} />
      {me.data && (
        <WalletSheet
          address={me.data.tempo_address}
          balances={undefined}
          balancesLoading={false}
          onDeposit={notYet('Deposit')}
          onSwap={notYet('Swap')}
          swapNeeded={false}
          controls={{
            allocation: me.data.allocation,
            weeklyLimit: me.data.weekly_limit,
            autoFreeFallback: me.data.auto_free_fallback,
            disabled: settings.isPending,
            onChange: (p) => {
              settings.mutate({
                ...(p.allocation !== undefined ? { allocation: p.allocation } : {}),
                ...(p.weekly_limit !== undefined ? { weekly_limit: p.weekly_limit } : {}),
                ...(p.auto_free_fallback !== undefined ? { auto_free_fallback: p.auto_free_fallback } : {}),
              });
            },
          }}
          permission={{ status: 'none', onApprove: notYet('Spend permission'), onRevoke: notYet('Revoke') }}
          onOpenAllocation={notYet('Open allocation')}
          onTopUp={notYet('Top up')}
        />
      )}
      <ReceiptDrawer />
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
