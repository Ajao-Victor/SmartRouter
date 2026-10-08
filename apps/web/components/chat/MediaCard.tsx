'use client';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { Download } from 'lucide-react';
import { motion } from 'motion/react';

import { env } from '@/lib/env';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { circleReveal, withReduced } from '@/lib/motion/variants';

import { HoloCard } from '@/components/fx/HoloCard';
import { Button } from '@/components/ui/Button';

export interface MediaCardProps {
  url: string;
  mime: string;
  /** Shared layoutId with JobCard so the job capsule morphs into the result. */
  layoutId?: string;
  alt?: string;
}

function isObjectStorage(url: string): boolean {
  try {
    return env.objectStorageHost !== '' && new URL(url).hostname === env.objectStorageHost;
  } catch {
    return false;
  }
}

/** Image or audio result (PDF: images return as files; songs finish in the worker). */
export function MediaCard({ url, mime, layoutId, alt = 'Generated result' }: MediaCardProps) {
  const reduced = useReducedMotionSafe();
  const isAudio = mime.startsWith('audio/');
  return (
    <motion.div {...(layoutId ? { layoutId } : {})} className="max-w-md">
      <HoloCard tone="teal" tilt={4} className="overflow-hidden p-2">
        {isAudio ? (
          <AudioPlayer url={url} />
        ) : (
          <motion.div variants={withReduced(circleReveal, reduced)} initial="hidden" animate="visible" className="relative aspect-square w-full overflow-hidden rounded-md">
            <Image src={url} alt={alt} fill sizes="(max-width: 768px) 100vw, 448px" className="object-cover" unoptimized={!isObjectStorage(url)} />
          </motion.div>
        )}
        <div className="flex items-center justify-between px-1 pt-2">
          <span className="num text-2xs text-text-2">{mime}</span>
          <Button variant="ghost" size="sm" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
            <Download size={14} /> Download
          </Button>
        </div>
      </HoloCard>
    </motion.div>
  );
}

/** Audio with a canvas waveform that reacts to playback (design.md §4.6). */
function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const draw = () => {
      t += playing ? 0.12 : 0.02;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const bars = 48;
      for (let i = 0; i < bars; i += 1) {
        const amp = playing ? 0.35 + 0.65 * Math.abs(Math.sin(t + i * 0.45)) : 0.2 + 0.1 * Math.sin(t + i * 0.3);
        const bh = Math.max(2, amp * h * 0.9);
        ctx.fillStyle = i % 2 === 0 ? '#19e6c1' : '#7c5cff';
        ctx.globalAlpha = 0.85;
        ctx.fillRect((i / bars) * w + 1, (h - bh) / 2, w / bars - 2, bh);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [playing]);

  return (
    <div className="space-y-2 p-2">
      <canvas ref={canvasRef} width={400} height={64} className="h-16 w-full rounded-md bg-bg-0/50" aria-hidden="true" />
      <audio
        ref={audioRef}
        src={url}
        controls
        className="w-full"
        onPlay={() => {
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onEnded={() => {
          setPlaying(false);
        }}
      >
        <track kind="captions" />
      </audio>
    </div>
  );
}
