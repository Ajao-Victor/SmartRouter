import { ReceiptView } from '@/components/receipt/ReceiptView';

/** Deep link to a receipt (also opens as a drawer from any reply). */
export default async function ReceiptPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const safe = /^[a-zA-Z0-9_-]{1,64}$/.test(requestId) ? requestId : null;
  return (
    <section className="space-y-4">
      <p className="num text-2xs tracking-label text-text-2 uppercase">receipt</p>
      {safe ? <ReceiptView requestId={safe} /> : <p className="text-sm text-signal">Invalid receipt id.</p>}
    </section>
  );
}
