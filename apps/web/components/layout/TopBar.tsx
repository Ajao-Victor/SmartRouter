'use client';

import Link from 'next/link';

import { clsx } from 'clsx';
import { Wallet } from 'lucide-react';
import { motion } from 'motion/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, withReduced } from '@/lib/motion/variants';

import { useUiStore } from '@/stores/uiStore';

import { GlitchText } from '@/components/fx/GlitchText';
import { RouterOrb } from '@/components/fx/RouterOrb';
import { Button } from '@/components/ui/Button';

export interface TopBarProps {
  /** Chat title (written by the free model) — glitches in when it first arrives. */
  title?: string | null;
  /** Right-side slot (AllocationHUD in Task 15). */
  right?: React.ReactNode;
  /** Heartbeat pulse counter for the orb. */
  pulseKey?: number;
  className?: string;
}

/** Sticky glass top bar: living orb logo, wordmark, chat title, HUD slot, wallet button. */
export function TopBar({ title, right, pulseKey = 0, className }: TopBarProps) {
  const reduced = useReducedMotionSafe();
  const toggleWallet = useUiStore((s) => s.toggleWallet);
  return (
    <motion.header
      variants={withReduced(fadeUp, reduced)}
      initial="hidden"
      animate="visible"
      className={clsx('glass sticky top-0 z-content flex h-14 items-center gap-3 px-3 sm:px-4', className)}
    >
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-pill pr-2" aria-label="SmartRouter home">
        <RouterOrb size={28} pulseKey={pulseKey} />
        <span className="font-display hidden text-base font-semibold text-text-0 sm:inline">
          Smart<span className="text-beam">Router</span>
        </span>
      </Link>
      <div className="min-w-0 flex-1 truncate text-center text-sm text-text-1 sm:text-left">
        {title ? <GlitchText text={title} as="span" className="text-text-0" /> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Wallet"
          onClick={() => {
            toggleWallet();
          }}
        >
          <Wallet size={20} />
        </Button>
      </div>
    </motion.header>
  );
}
