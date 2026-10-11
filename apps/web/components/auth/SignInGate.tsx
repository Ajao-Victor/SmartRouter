'use client';

import { useAuth } from '@/hooks/useAuth';

export interface SignInGateProps {
  /** What the screen shows once signed in, e.g. "your activity". */
  what: string;
  children: React.ReactNode;
}

/** Screens that only make sense signed in (activity, settings, a saved chat) ask for sign-in in place. */
export function SignInGate({ what, children }: SignInGateProps) {
  const auth = useAuth();
  if (auth.isSignedIn) return <>{children}</>;
  return (
    <section className="space-y-3 pt-10 text-center">
      <p className="text-lg text-text-1">Sign in to see {what}.</p>
      <p className="text-sm text-text-2">Email or Google. The same email brings back your chats on any device.</p>
      <button
        type="button"
        onClick={() => {
          auth.signIn();
        }}
        disabled={auth.signingIn}
        className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-text-inverse transition-colors hocus:bg-accent-hi disabled:opacity-60"
      >
        {auth.signingIn ? 'Signing in…' : 'Sign in'}
      </button>
    </section>
  );
}
