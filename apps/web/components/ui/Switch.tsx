'use client';

import { clsx } from 'clsx';
import { motion } from 'motion/react';

import { springs } from '@/lib/motion/springs';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/** Toggle with a liquid thumb that slides on the liquid spring and glows teal when on. */
export function Switch({ checked, onChange, label, description, disabled = false, className }: SwitchProps) {
  const reduced = useReducedMotionSafe();
  return (
    <label className={clsx('flex cursor-pointer items-center justify-between gap-4', disabled && 'cursor-not-allowed opacity-50', className)}>
      <span className="min-w-0">
        <span className="block text-sm text-text-0">{label}</span>
        {description && <span className="block text-xs text-text-2">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          onChange(!checked);
        }}
        className={clsx(
          'relative h-7 w-12 shrink-0 rounded-pill transition-[background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          checked ? 'bg-accent-2/30 shadow-glow-teal' : 'bg-bg-3 shadow-hairline',
        )}
      >
        <motion.span
          aria-hidden="true"
          className={clsx('absolute top-1 left-1 h-5 w-5 rounded-full', checked ? 'bg-accent-2' : 'bg-text-2')}
          animate={{ x: checked ? 20 : 0, scale: 1 }}
          transition={reduced ? { duration: 0 } : springs.liquid}
        />
      </button>
    </label>
  );
}
