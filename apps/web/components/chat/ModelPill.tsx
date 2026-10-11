'use client';

import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

import { useUiStore } from '@/stores/uiStore';

export interface ModelPillProps {
  label: string | null;
  isFree?: boolean;
  className?: string;
  disabled?: boolean;
}

/** Current-model control in the composer. Tap → ModelPicker. */
export function ModelPill({ label, isFree = false, className, disabled = false }: ModelPillProps) {
  const openDialog = useUiStore((s) => s.openDialog);
  const text = label ?? 'Auto · best pick';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        openDialog('modelPicker');
      }}
      aria-label={`Model: ${text}`}
      className={clsx(
        'inline-flex h-8 max-w-[60vw] items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors hocus:bg-bg-2 disabled:opacity-50 sm:max-w-xs',
        isFree ? 'text-free' : 'text-text-1 hocus:text-text-0',
        className,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', isFree ? 'bg-free' : 'bg-accent-2')} aria-hidden="true" />
      <span className="truncate">{text}</span>
      <ChevronDown size={14} className="shrink-0 text-text-2" aria-hidden="true" />
    </button>
  );
}
