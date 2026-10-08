'use client';

import { useUiStore } from '@/stores/uiStore';

import { HoloCard } from '@/components/fx/HoloCard';

/** PDF: naira via Paystack and MPP Credits (T12, mainnet Oct 13) are coming soon — dashed, with a waitlist. */
export function ComingSoonTeasers() {
  const openDialog = useUiStore((s) => s.openDialog);
  const items = [
    { title: 'Naira via Paystack', body: 'Top up in naira once a licensed partner is live.', interest: 'naira' },
    { title: 'MPP Credits', body: 'Pay with closed-loop credits after the T12 upgrade.', interest: 'credits' },
  ] as const;
  return (
    <section className="space-y-3">
      <p className="num text-2xs tracking-label text-text-2 uppercase">Coming soon</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <HoloCard
            key={it.interest}
            dashed
            tilt={4}
            className="p-5"
            role="button"
            tabIndex={0}
            aria-label={`${it.title} — join the waitlist`}
            onClick={() => {
              openDialog('waitlist');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDialog('waitlist');
              }
            }}
          >
            <p className="font-display text-lg text-text-0">{it.title}</p>
            <p className="mt-1 text-sm text-text-1">{it.body}</p>
            <p className="num mt-3 text-2xs tracking-wider-ui text-accent-2 uppercase">Join the waitlist →</p>
          </HoloCard>
        ))}
      </div>
    </section>
  );
}
