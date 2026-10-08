'use client';

import { useRouter } from 'next/navigation';

import { toast } from '@/stores/toastStore';

import { ComingSoonTeasers } from '@/components/landing/ComingSoonTeasers';
import { Hero } from '@/components/landing/Hero';
import { ProofStrip } from '@/components/landing/ProofStrip';
import { SavingProof } from '@/components/landing/SavingProof';
import { TaskChips } from '@/components/landing/TaskChips';
import { Attribution } from '@/components/ui/Attribution';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  // Task 18 replaces this with the Tempo Accounts SDK passkey flow.
  const onSignIn = () => {
    toast.info('Passkey sign-in arrives in Task 18', 'Start a task to preview the chat on mock data.');
  };

  return (
    <div className="mx-auto max-w-5xl px-4">
      <header className="flex h-14 items-center justify-between">
        <span className="font-display text-base font-semibold text-text-0">
          Smart<span className="text-beam">Router</span>
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSignIn}>
            Sign in
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              router.push('/chat');
            }}
          >
            Open app
          </Button>
        </div>
      </header>
      <main className="space-y-20 pb-24">
        <Hero onSignIn={onSignIn} />
        <TaskChips />
        <SavingProof />
        <ProofStrip />
        <ComingSoonTeasers />
      </main>
      <footer className="flex flex-col gap-2 border-t border-line py-8 text-xs text-text-2 sm:flex-row sm:items-center sm:justify-between">
        <Attribution />
        <p>Models available via MPP · Fees sponsored on Tempo · You only spend USDC.e</p>
      </footer>
    </div>
  );
}
