'use client';

import { GlowTrailLayer } from '@/components/fx/GlowTrail';
import { ParticleLayer } from '@/components/fx/ParticleBurst';
import { RouterField } from '@/components/fx/RouterField';

/** The showpiece layers (WebGL field, glow trails, particles) — landing page only. */
export function LandingFx() {
  return (
    <>
      <RouterField />
      <GlowTrailLayer />
      <ParticleLayer />
    </>
  );
}
