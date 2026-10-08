'use client';

import { useUiStore } from '@/stores/uiStore';

import { ReceiptView } from '@/components/receipt/ReceiptView';
import { Drawer } from '@/components/ui/Drawer';

/** Receipt drawer bound to `uiStore.receiptRequestId` (one tap from any reply). */
export function ReceiptDrawer() {
  const requestId = useUiStore((s) => s.receiptRequestId);
  const closeReceipt = useUiStore((s) => s.closeReceipt);
  return (
    <Drawer open={requestId !== null} onClose={closeReceipt} title="Receipt">
      {requestId && <ReceiptView requestId={requestId} />}
    </Drawer>
  );
}
