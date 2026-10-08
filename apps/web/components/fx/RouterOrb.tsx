'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { clsx } from 'clsx';
import { motion } from 'motion/react';

import { canUseWebGL } from '@/lib/motion/capabilities';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { pulseLoop } from '@/lib/motion/variants';

import { selectActivity, useStreamStore } from '@/stores/streamStore';
import { useUiStore } from '@/stores/uiStore';

const RouterOrbScene = dynamic(() => import('@/components/fx/RouterOrbScene'), { ssr: false });

export interface RouterOrbProps {
  /** Diameter in px. */
  size?: number;
  /** 0..1; defaults to live stream activity. */
  activity?: number;
  /** Increment to fire a one-shot pulse (SSE heartbeat). */
  pulseKey?: number;
  className?: string;
}

/**
 * The Router's living core (design.md §2). WebGL transmission orb when capable; otherwise a
 * CSS orb with layered radial glows. Pulses with stream activity and on heartbeat.
 */
export function RouterOrb({ size = 48, activity, pulseKey = 0, className }: RouterOrbProps) {
  const reduced = useReducedMotionSafe();
  const liveActivity = useStreamStore(selectActivity);
  const sdkDialogOpen = useUiStore((s) => s.sdkDialogOpen);
  const [webgl, setWebgl] = useState(false);
  const [hidden, setHidden] = useState(false);
  const a = activity ?? liveActivity;

  useEffect(() => {
    setWebgl(canUseWebGL());
    const onVis = () => {
      setHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  if (webgl && !reduced) {
    return (
      <div className={clsx('relative', className)} style={{ width: size, height: size }} aria-hidden="true">
        <RouterOrbScene activity={a} pulseKey={pulseKey} paused={sdkDialogOpen || hidden} />
      </div>
    );
  }

  return (
    <motion.div
      aria-hidden="true"
      className={clsx('relative rounded-full', className)}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 35% 30%, #c9bfff 0%, #7c5cff 35%, #2a1f6e 70%, #05060a 100%)',
        boxShadow: `0 0 ${String(Math.round(size * 0.6))}px -${String(Math.round(size * 0.15))}px var(--accent), inset 0 0 ${String(Math.round(size * 0.25))}px var(--accent-2)`,
      }}
      variants={reduced ? undefined : pulseLoop}
      animate={reduced ? undefined : a > 0.1 ? 'active' : 'idle'}
    >
      <span className="absolute inset-[30%] rounded-full bg-accent-2 opacity-80 blur-[2px]" />
    </motion.div>
  );
}
