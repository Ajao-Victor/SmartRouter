'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';

import { isApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { waitlistInputSchema, type WaitlistInput } from '@/lib/api/types';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { pop, withReduced } from '@/lib/motion/variants';

import { toast } from '@/stores/toastStore';

import { burstAt, useParticleBurst } from '@/components/fx/ParticleBurst';
import { Input } from '@/components/ui/Input';
import { MagneticButton } from '@/components/ui/MagneticButton';

/** Country allowlist (security.md §6). Nigeria first (PDF beta community). */
export const COUNTRIES = [
  ['NG', 'Nigeria'],
  ['GH', 'Ghana'],
  ['KE', 'Kenya'],
  ['ZA', 'South Africa'],
  ['GB', 'United Kingdom'],
  ['US', 'United States'],
  ['IN', 'India'],
  ['BR', 'Brazil'],
  ['OT', 'Other'],
] as const;

export interface WaitlistFormProps {
  interest: WaitlistInput['interest'];
  onDone?: () => void;
}

/** PDF waitlist: email, country, interest (naira | credits). */
export function WaitlistForm({ interest, onDone }: WaitlistFormProps) {
  const reduced = useReducedMotionSafe();
  const burst = useParticleBurst();
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<string>('NG');
  const [error, setError] = useState<string | undefined>(undefined);
  const [done, setDone] = useState(false);

  const join = useMutation({
    mutationFn: (input: WaitlistInput) => api.waitlist.join(input),
  });

  const [at, setAt] = useState<{ clientX: number; clientY: number } | null>(null);

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const parsed = waitlistInputSchema.safeParse({ email: email.trim(), country, interest });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.path[0] === 'email' ? 'Enter a valid email address' : 'Check the form');
      return;
    }
    setError(undefined);
    join.mutate(parsed.data, {
      onSuccess: () => {
        setDone(true);
        if (at) burst(burstAt(at, '#19E6C1', 40));
        toast.success("You're on the list", interest === 'naira' ? 'Naira top-ups via Paystack' : 'MPP Credits');
        onDone?.();
      },
      onError: (err) => {
        toast.error('Could not join the waitlist', isApiError(err) ? err.message : undefined);
      },
    });
  };

  if (done) {
    return (
      <motion.p role="status" variants={withReduced(pop, reduced)} initial="idle" animate="active" className="flex items-center gap-2 text-sm text-accent-2">
        <Check size={16} /> You&apos;re on the waitlist.
      </motion.p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={submit} noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
        {...(error ? { error } : {})}
      />
      <label className="flex flex-col gap-1.5">
        <span className="num text-2xs tracking-wider-ui text-text-2 uppercase">Country</span>
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
          }}
          className="glass h-11 rounded-md px-3 text-base text-text-0 focus:shadow-glow-accent focus:outline-none"
        >
          {COUNTRIES.map(([code, name]) => (
            <option key={code} value={code} className="bg-bg-1">
              {name}
            </option>
          ))}
        </select>
      </label>
      <MagneticButton
        type="submit"
        size="md"
        loading={join.isPending}
        className="w-full"
        onClick={(e) => {
          setAt({ clientX: e.clientX, clientY: e.clientY });
        }}
      >
        Join the {interest === 'naira' ? 'naira' : 'credits'} waitlist
      </MagneticButton>
    </form>
  );
}
