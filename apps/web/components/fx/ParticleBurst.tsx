'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

import { useFxStore, type BurstOptions } from '@/stores/fxStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

const MAX = 120;

/** Imperative API: `burst({x, y, color, count})` at viewport coordinates. No-op under reduced motion. */
export function useParticleBurst() {
  const reduced = useReducedMotionSafe();
  return useCallback(
    (opts: BurstOptions) => {
      if (reduced) return;
      useFxStore.getState().burstHandler?.(opts);
    },
    [reduced],
  );
}

/** Convert a pointer/mouse event to a burst origin. */
export function burstAt(e: { clientX: number; clientY: number }, color?: string, count?: number): BurstOptions {
  return { x: e.clientX, y: e.clientY, ...(color ? { color } : {}), ...(count ? { count } : {}) };
}

/**
 * Singleton canvas 2D particle system (design.md §5: one system, ≤120 particles).
 * A new burst replaces the current one. Mount once (root layout).
 */
export function ParticleLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${String(window.innerWidth)}px`;
      canvas.style.height = `${String(window.innerHeight)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const alive: Particle[] = [];
      for (const p of particles.current) {
        p.life -= dt * 1.6;
        if (p.life <= 0) continue;
        p.vy += 220 * dt;
        p.vx *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + p.life * 0.6), 0, Math.PI * 2);
        ctx.fill();
        alive.push(p);
      }
      particles.current = alive;
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (alive.length > 0) raf.current = requestAnimationFrame(tick);
      else raf.current = null;
    };

    const burst = ({ x, y, color = '#7C5CFF', count = 48 }: BurstOptions) => {
      const n = Math.min(MAX, Math.max(1, count));
      const next: Particle[] = [];
      for (let i = 0; i < n; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 120 + Math.random() * 260;
        next.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 80,
          life: 0.7 + Math.random() * 0.5,
          size: 1.5 + Math.random() * 2.5,
          color,
        });
      }
      particles.current = next;
      if (raf.current === null) {
        last = performance.now();
        raf.current = requestAnimationFrame(tick);
      }
    };

    useFxStore.getState().setBurstHandler(burst);
    return () => {
      useFxStore.getState().setBurstHandler(null);
      window.removeEventListener('resize', resize);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-toast" />;
}
