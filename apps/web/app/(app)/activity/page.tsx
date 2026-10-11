'use client';

import { formatUsd } from '@/lib/money';

import { useRequests } from '@/hooks/useReceipt';
import { useUiStore } from '@/stores/uiStore';

import { SignInGate } from '@/components/auth/SignInGate';
import { Skeleton } from '@/components/ui/Skeleton';

const STATUS: Record<string, string> = { pending: 'Pending', running: 'Running', succeeded: 'Done', failed: 'Failed', refunded: 'Refunded' };

export default function ActivityPage() {
  return (
    <SignInGate what="your activity">
      <Activity />
    </SignInGate>
  );
}

/** `GET /requests` — past runs and what they charged; tap a row for its receipt. */
function Activity() {
  const requests = useRequests();
  const openReceipt = useUiStore((s) => s.openReceipt);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-0">Activity</h1>
        <p className="text-sm text-text-2">Every run and what it charged. Failed answers are refunded.</p>
      </header>
      {requests.isPending ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : requests.isError ? (
        <p role="alert" className="text-sm text-signal">Could not load your activity.</p>
      ) : requests.data.requests.length === 0 ? (
        <p className="text-sm text-text-2">Nothing yet.</p>
      ) : (
        <ul className="divide-y divide-line" aria-label="Requests">
          {requests.data.requests.map((r) => (
            <li key={r.requestId}>
              <button
                type="button"
                onClick={() => {
                  openReceipt(r.requestId);
                }}
                className="flex w-full items-center gap-4 rounded-lg px-2 py-3 text-left transition-colors hocus:bg-bg-1"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-0">{r.label ?? r.modelId ?? r.requestId}</span>
                  <span className="mt-0.5 block text-xs text-text-2">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                    {r.createdAt && ' · '}
                    <span className={r.status === 'failed' ? 'text-signal' : ''}>{STATUS[r.status] ?? r.status}</span>
                  </span>
                </span>
                <span className={`num shrink-0 text-sm ${r.free || r.chargedUsd === 0 ? 'text-free' : 'text-text-0'}`}>{r.free || r.chargedUsd === 0 ? 'Free' : formatUsd(r.chargedUsd)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
