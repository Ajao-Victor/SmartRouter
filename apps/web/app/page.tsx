'use client';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';

import { ComingSoonTeasers } from '@/components/landing/ComingSoonTeasers';
import { Hero } from '@/components/landing/Hero';
import { ProofStrip } from '@/components/landing/ProofStrip';
import { SavingProof } from '@/components/landing/SavingProof';
import { TaskChips } from '@/components/landing/TaskChips';
import { Attribution } from '@/components/ui/Attribution';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  const auth = useAuth();
  // Tempo passkey dialog → SIWE → cookie → app.
  const onSignIn = () => {
    auth.signIn.mutate(undefined, {
      onSuccess: () => {
        router.push('/chat');
      },
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4">
      <header className="flex h-14 items-center justify-between">
        <span className="font-display text-base font-semibold text-text-0">
          Smart<span className="text-beam">Router</span>
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSignIn} loading={auth.signIn.isPending}>
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
        <Hero onSignIn={onSignIn} signingIn={auth.signIn.isPending} />
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
