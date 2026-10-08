'use client';

import { motion } from 'motion/react';

import { shortHex } from '@/lib/explorer';
import { formatUsd } from '@/lib/money';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, stagger, withReduced } from '@/lib/motion/variants';

import { useModelLabel } from '@/hooks/useModelLabel';
import { useReceipt } from '@/hooks/useReceipt';

import { TxHashReveal } from '@/components/receipt/TxHashReveal';
import { Skeleton } from '@/components/ui/Skeleton';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const reduced = useReducedMotionSafe();
  return (
    <motion.div variants={withReduced(fadeUp, reduced)} className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="text-xs text-text-2">{label}</dt>
      <dd className="num text-right text-xs text-text-0">{children}</dd>
    </motion.div>
  );
}

/** PDF receipt fields: model, price, provider cost, latency, session id (now), voucher, provider receipt, tx hash (after settlement). */
export function ReceiptView({ requestId }: { requestId: string }) {
  const reduced = useReducedMotionSafe();
  const receipt = useReceipt(requestId);
  const model = useModelLabel(receipt.data?.model_id ?? null);

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
  return (
    <motion.dl variants={withReduced(stagger({ each: 0.05 }), reduced)} initial="hidden" animate="visible" aria-label="Receipt">
      <Row label="Model">{model?.label ?? r.model_id}{model && !model.isFree && <span className="text-text-2"> · via MPP</span>}</Row>
      <Row label="Price">{r.is_free ? <span className="text-free">Free</span> : <span className="text-price">{formatUsd(r.price)}</span>}</Row>
      {r.provider_cost !== null && <Row label="Provider cost">{formatUsd(r.provider_cost)}</Row>}
      {r.latency_ms !== null && <Row label="Latency">{String(Math.round(r.latency_ms / 100) / 10)} s</Row>}
      <Row label="Status">{r.status}</Row>
      {r.channel_id && <Row label="Session">{shortHex(r.channel_id, 8, 4)}</Row>}
      {r.voucher_amount !== null && <Row label="Voucher">{formatUsd(r.voucher_amount)}</Row>}
      {r.provider_receipt && <Row label="Provider receipt">{shortHex(r.provider_receipt, 10, 6)}</Row>}
      <Row label="Settlement">
        {r.tx_hash ? (
          <TxHashReveal hash={r.tx_hash} />
        ) : r.is_free ? (
          <span className="text-text-2">none (free)</span>
        ) : (
          <span className="text-warn">pending · settles every $1 or hourly</span>
        )}
      </Row>
      <Row label="Request">{shortHex(r.id, 8, 4)}</Row>
    </motion.dl>
  );
}
