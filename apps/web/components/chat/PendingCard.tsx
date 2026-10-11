'use client';

import { Loader2 } from 'lucide-react';

/** PDF `pending` event: a slow song or image job continues in the background; we poll `GET /requests/:id`. */
export function PendingCard({ label }: { label?: string | null }) {
  return (
    <div role="status" aria-live="polite" className="inline-flex items-center gap-2 rounded-lg bg-bg-1 px-3 py-2 text-sm text-text-1 shadow-hairline">
      <Loader2 size={16} className="motion-ok:animate-spin text-accent-2" aria-hidden="true" />
      Still working{label ? ` on ${label}` : ''}… this can take a few minutes. You can keep chatting.
    </div>
  );
}
