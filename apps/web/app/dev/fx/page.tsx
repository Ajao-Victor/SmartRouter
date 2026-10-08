'use client';

import { useRef, useState } from 'react';

import { notFound } from 'next/navigation';

import { micro } from '@/lib/money';

import { FloatingDock } from '@/components/fx/FloatingDock';
import { GlitchText } from '@/components/fx/GlitchText';
import { useGlowTrail } from '@/components/fx/GlowTrail';
import { HoloCard } from '@/components/fx/HoloCard';
import { LiquidRing, type RingState } from '@/components/fx/LiquidRing';
import { burstAt, useParticleBurst } from '@/components/fx/ParticleBurst';
import { RouterOrb } from '@/components/fx/RouterOrb';
import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { PriceTag } from '@/components/ui/PriceTag';
import { Slider } from '@/components/ui/Slider';


const TITLES = ['Cover letter for Paystack', 'Lagos travel itinerary', 'Fix the pg-boss retry bug'];
const STATES: RingState[] = ['ok', 'low', 'used', 'toppingUp'];

/** Dev-only FX gallery (Task 7 acceptance). 404 in production. */
export default function FxPage() {
  const [title, setTitle] = useState(0);
  const [selected, setSelected] = useState(0);
  const [level, setLevel] = useState(0.8);
  const [ring, setRing] = useState<RingState>('ok');
  const [activity, setActivity] = useState(1);
  const [pulse, setPulse] = useState(0);
  const [shake, setShake] = useState(0);
  const [focused, setFocused] = useState(false);
  const runRef = useRef<HTMLButtonElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hudRef = useRef<HTMLDivElement | null>(null);
  const drawTrail = useGlowTrail();
  const burst = useParticleBurst();

  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-12 pb-48">
      <header className="flex items-center gap-5">
        <RouterOrb size={96} activity={activity / 2} pulseKey={pulse} />
        <div className="space-y-1">
          <p className="num text-2xs tracking-label text-text-2 uppercase">dev · fx layer</p>
          <h1 className="font-display text-display-sm text-text-0">
            <GlitchText text={TITLES[title] ?? ''} as="span" />
          </h1>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setTitle((t) => (t + 1) % TITLES.length); }}>
              Glitch next title
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setPulse((p) => p + 1); }}>
              Heartbeat pulse
            </Button>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-text-0">Orb activity</h2>
        <div className="glass max-w-md rounded-lg p-5">
          <Slider
            detents={[{ label: 'Idle' }, { label: 'Streaming' }, { label: 'Compare' }]}
            value={activity}
            onChange={setActivity}
            aria-label="Orb activity"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-text-0">HoloCards (tilt · spotlight · conic ring when selected)</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: 'GLM 5.3 Flash', price: 800, tone: 'accent' as const, why: '80% of the best quality at 1/34 of the price' },
            { label: 'Llama 3.3 70B', price: 700, tone: 'accent' as const, why: 'Fast and cheap for drafts' },
            { label: 'Claude Opus 5.5', price: 26_000, tone: 'teal' as const, why: 'Best quality' },
            { label: 'Free · Llama 3.1 8B', price: 0, tone: 'free' as const, why: 'Never stuck' },
          ].map((m, i) => (
            <HoloCard
              key={m.label}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              tone={m.tone}
              selected={selected === i}
              onClick={() => { setSelected(i); }}
              className="p-4"
            >
              <p className="text-sm font-medium text-text-0">{m.label}</p>
              <p className="mt-1 text-xs text-text-2">via MPP</p>
              <div className="mt-3">
                <PriceTag micro={micro(m.price)} size="lg" freeLabel />
              </div>
              <p className="mt-2 text-xs text-text-1">{m.why}</p>
            </HoloCard>
          ))}
          <HoloCard dashed interactive={false} className="p-4 md:col-span-2">
            <p className="text-sm font-medium text-text-0">Naira via Paystack</p>
            <p className="mt-1 text-xs text-text-2">Coming soon · waitlist</p>
          </HoloCard>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-text-0">LiquidRing (allocation HUD)</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div ref={hudRef}>
            <LiquidRing level={level} state={ring} size={88} aria-label="Allocation remaining">
              ${(level * 2).toFixed(2)}
            </LiquidRing>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATES.map((s) => (
              <Button key={s} size="sm" variant={ring === s ? 'primary' : 'secondary'} onClick={() => { setRing(s); }}>
                {s}
              </Button>
            ))}
            <Button size="sm" variant="secondary" onClick={() => { setLevel((l) => Math.max(0, l - 0.2)); }}>
              Spend $0.40
            </Button>
            <Button size="sm" variant="free" onClick={() => { setLevel(1); }}>
              Top up
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-text-0">Trail + burst (the routing moment)</h2>
        <MagneticButton
          ref={runRef}
          size="lg"
          onClick={(e) => {
            burst(burstAt(e, '#19e6c1', 90));
            drawTrail(runRef.current, [cardRefs.current[selected] ?? null, hudRef.current]);
            setLevel((l) => Math.max(0, l - 0.05));
          }}
        >
          Run · <PriceTag micro={micro(900)} tone="neutral" />
        </MagneticButton>
      </section>

      <FloatingDock focused={focused} shakeKey={shake}>
        <div className="flex items-center gap-3 p-3">
          <input
            className="num flex-1 bg-transparent px-2 text-sm text-text-0 outline-none placeholder:text-text-2"
            placeholder="Describe the task… (focus lifts the dock)"
            onFocus={() => { setFocused(true); }}
            onBlur={() => { setFocused(false); }}
          />
          <Button size="sm" variant="ghost" onClick={() => { setShake((k) => k + 1); }}>
            Shake (429)
          </Button>
          <Button size="sm">Run</Button>
        </div>
      </FloatingDock>
    </main>
  );
}
