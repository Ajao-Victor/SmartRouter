'use client';

import { apiUnreachableHint } from '@/lib/api/errors';

import { useAuth } from '@/hooks/useAuth';
import { useCloseSession } from '@/hooks/useCloseSession';
import { useMe } from '@/hooks/useMe';
import { useSession } from '@/hooks/useSession';
import { useSettings } from '@/hooks/useSettings';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';

import { AllocationHUD } from '@/components/allocation/AllocationHUD';
import { TopBar } from '@/components/layout/TopBar';
import { ReceiptDrawer } from '@/components/receipt/ReceiptDrawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { DepositDialog } from '@/components/wallet/DepositDialog';
import { WalletSheet } from '@/components/wallet/WalletSheet';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string | null;
}

/**
 * App shell. Signed-out visitors get the normal chat screens (Handover "Guest mode"); the sign-in
 * modal appears only when they send. Signed in: `GET /me` on load (seeds the usage banner),
 * `GET /sessions/current` (payment setup + deposit), wallet sheet, deposit dialog, receipts.
 */
export function AppShell({ children, title }: AppShellProps) {
  const me = useMe();
  const settings = useSettings();
  const auth = useAuth();
  const closeSession = useCloseSession();
  const pageTitle = useUiStore((s) => s.pageTitle);
  const openDeposit = useUiStore((s) => s.openDeposit);
  useSession(auth.isSignedIn && Boolean(me.data));

  const right = auth.isSignedIn ? (
    me.data ? <AllocationHUD /> : null
  ) : auth.status === 'unknown' ? null : (
    <button
      type="button"
      onClick={() => {
        auth.signIn();
      }}
      disabled={auth.signingIn}
      className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi disabled:opacity-60"
    >
      {auth.signingIn ? 'Signing in…' : 'Sign in'}
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg-0">
      <TopBar title={title ?? pageTitle} right={right} />
      {me.data && (
        <WalletSheet
          user={me.data}
          busy={{ close: closeSession.isPending, settings: settings.isPending, signOut: auth.signOut.isPending }}
          onTopUp={() => {
            openDeposit();
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
      {auth.isSignedIn && <DepositDialog />}
      <ReceiptDrawer />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-4">
        {auth.status === 'unknown' || (auth.isSignedIn && me.isPending) ? (
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
