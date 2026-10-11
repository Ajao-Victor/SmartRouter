'use client';

import { shortHex } from '@/lib/explorer';
import { formatUsd } from '@/lib/money';

import { useModelLabel } from '@/hooks/useModelLabel';
import { useReceipt } from '@/hooks/useReceipt';

import { TxHashReveal } from '@/components/receipt/TxHashReveal';
import { Skeleton } from '@/components/ui/Skeleton';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="text-xs text-text-2">{label}</dt>
      <dd className="num text-right text-xs text-text-0">{children}</dd>
    </div>
  );
}

const STATUS: Record<string, string> = { pending: 'Pending', running: 'Running', succeeded: 'Succeeded', failed: 'Failed', refunded: 'Refunded' };

/** `GET /requests/:id`: a run and what it charged. Refunds appear here. */
export function ReceiptView({ requestId }: { requestId: string }) {
  const receipt = useReceipt(requestId);
  const model = useModelLabel(receipt.data?.modelId ?? null, receipt.data?.label);

  if (receipt.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }
  if (receipt.isError) {
    return <p role="alert" className="text-sm text-signal">Could not load this receipt.</p>;
  }
  const r = receipt.data;
  const live = r.status === 'pending' || r.status === 'running';
  return (
    <dl aria-label="Receipt">
      <Row label="Model">{model?.label ?? r.modelId ?? '—'}</Row>
      <Row label="Charged">{r.free || r.chargedUsd === 0 ? <span className="text-free">Free</span> : <span className="text-price">{formatUsd(r.chargedUsd)}</span>}</Row>
      {r.refundedUsd !== null && r.refundedUsd > 0 && <Row label="Refunded">{formatUsd(r.refundedUsd)}</Row>}
      {r.latencyMs !== null && <Row label="Latency">{String(Math.round(r.latencyMs / 100) / 10)} s</Row>}
      <Row label="Status">
        <span className={r.status === 'failed' ? 'text-signal' : live ? 'text-warn' : 'text-text-0'}>{STATUS[r.status] ?? r.status}</span>
      </Row>
      {r.error && <Row label="Error">{r.error}</Row>}
      {r.createdAt && <Row label="When">{new Date(r.createdAt).toLocaleString()}</Row>}
      {r.compareGroup && <Row label="Compare group">{shortHex(r.compareGroup, 8, 4)}</Row>}
      {r.txHash && (
        <Row label="Settlement">
          <TxHashReveal hash={r.txHash} />
        </Row>
      )}
      <Row label="Request">{shortHex(r.requestId, 8, 4)}</Row>
      {live && <p className="pt-2 text-xs text-text-2">Still running — this refreshes every 5 seconds.</p>}
    </dl>
  );
}
