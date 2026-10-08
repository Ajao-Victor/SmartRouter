'use client';

import { useState } from 'react';

import type { WaitlistInput } from '@/lib/api/types';

import { useUiStore } from '@/stores/uiStore';

import { Chip } from '@/components/ui/Chip';
import { Dialog } from '@/components/ui/Dialog';
import { WaitlistForm } from '@/components/wallet/WaitlistForm';

/** Global waitlist dialog (opened from landing teasers and the top-up screen). */
export function WaitlistDialog() {
  const open = useUiStore((s) => s.activeDialog === 'waitlist');
  const closeDialog = useUiStore((s) => s.closeDialog);
  const [interest, setInterest] = useState<WaitlistInput['interest']>('naira');
  return (
    <Dialog open={open} onClose={closeDialog} title="Coming soon" description="Tell us which one you're waiting for.">
      <div className="mb-4 flex gap-2">
        <Chip selected={interest === 'naira'} onClick={() => { setInterest('naira'); }}>
          Naira via Paystack
        </Chip>
        <Chip tone="teal" selected={interest === 'credits'} onClick={() => { setInterest('credits'); }}>
          MPP Credits
        </Chip>
      </div>
      <WaitlistForm key={interest} interest={interest} />
    </Dialog>
  );
}
