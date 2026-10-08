'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { micro } from '@/lib/money';
import { openDeposit } from '@/lib/tempo/deposit';
import { openSwapToUsdce } from '@/lib/tempo/swap';




import { useAuth } from '@/hooks/useAuth';
import { useBalance } from '@/hooks/useBalance';
import { useMe } from '@/hooks/useMe';
import { useOpenAllocation } from '@/hooks/useOpenAllocation';
import { useSession } from '@/hooks/useSession';
import { useSettings } from '@/hooks/useSettings';
import { useSpendPermission } from '@/hooks/useSpendPermission';
import { useTopUp } from '@/hooks/useTopUp';
import { toast } from '@/stores/toastStore';

import { AllocationHUD } from '@/components/allocation/AllocationHUD';
import { burstAt, useParticleBurst } from '@/components/fx/ParticleBurst';
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
  const { restore } = useAuth();
  const qc = useQueryClient();
  const balance = useBalance(Boolean(me.data));
  const permission = useSpendPermission(Boolean(me.data));
  const openAllocation = useOpenAllocation();
  const topUp = useTopUp();
  const burst = useParticleBurst();
  useSession(Boolean(me.data));

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (me.isUnauthenticated) router.replace('/');
  }, [me.isUnauthenticated, router]);

  const allocationMicro = me.data?.allocation ?? micro(2_000_000);
  const onOpenAllocation = () => {
    openAllocation.mutate(allocationMicro);
  };
  const onTopUp = () => {
    topUp.mutate(allocationMicro, {
      onSuccess: () => {
        burst(burstAt({ clientX: window.innerWidth - 60, clientY: 40 }, '#19E6C1', 70));
      },
    });
  };
  const onDeposit = () => {
    openDeposit(qc).catch(() => {
      toast.error('Deposit was not completed');
    });
  };
  const onSwap = () => {
    openSwapToUsdce(qc)
      .then(() => {
        toast.success('Swapped to USDC.e');
      })
      .catch(() => {
        toast.error('Swap was not completed');
      });
  };
  const hud = <AllocationHUD allocationMicro={allocationMicro} onTopUp={onTopUp} onOpenAllocation={onOpenAllocation} />;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar {...(title !== undefined ? { title } : {})} right={right ?? (me.data ? hud : null)} />
      {me.data && (
        <WalletSheet
          address={me.data.tempo_address}
          balances={balance.data}
          balancesLoading={balance.isPending}
          onDeposit={onDeposit}
          onSwap={onSwap}
          swapNeeded={balance.hasNonUsdce}
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
          permission={{
            status: permission.status,
            expiresAt: permission.data?.expiresAt ?? null,
            busy: permission.approve.isPending || permission.revoke.isPending,
            onApprove: () => {
              permission.approve.mutate();
            },
            onRevoke: () => {
              permission.revoke.mutate();
            },
          }}
          onOpenAllocation={onOpenAllocation}
          onTopUp={onTopUp}
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
