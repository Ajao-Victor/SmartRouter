'use client';

import { clsx } from 'clsx';
import { Check } from 'lucide-react';

import type { Option } from '@/lib/api/types';

import { PriceTag } from '@/components/ui/PriceTag';

export interface ModelOptionsProps {
  options: Option[];
  selectedId?: string | null;
  onPick: (option: Option) => void;
  /** Compare mode: rows toggle into two slots instead of running. */
  compareMode?: boolean;
  compareIds?: readonly (string | null)[];
  onCompareToggle?: (modelId: string) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

const SPEED: Record<string, string> = { fast: 'Fast', steady: 'Steady', slow: 'Slow' };

/**
 * PDF options list (`POST /chats` / `POST /recommend`): three recommended models plus the free
 * option, each with its live price, speed and a one-line reason. Plain rows — one tap runs.
 */
export function ModelOptions({ options, selectedId = null, onPick, compareMode = false, compareIds = [], onCompareToggle, disabled = false, title = 'Pick a model', description, className }: ModelOptionsProps) {
  if (options.length === 0) return null;
  return (
    <section className={clsx('rounded-xl bg-bg-1 p-2 shadow-hairline', className)} aria-label={title}>
      <header className="px-2 pt-1 pb-2">
        <p className="text-sm font-medium text-text-0">{title}</p>
        {description && <p className="mt-0.5 text-xs text-text-2">{description}</p>}
      </header>
      <ul className="space-y-0.5" role={compareMode ? 'group' : 'listbox'}>
        {options.map((o, i) => {
          const checked = compareIds.includes(o.modelId);
          const selected = selectedId === o.modelId;
          const badge = o.free ? 'Free' : o.bestQuality ? 'Best quality' : i === 0 ? 'Recommended' : null;
          return (
            <li key={o.modelId}>
              <button
                type="button"
                role={compareMode ? 'checkbox' : 'option'}
                aria-checked={compareMode ? checked : undefined}
                aria-selected={compareMode ? undefined : selected}
                aria-label={o.label || o.modelId}
                disabled={disabled}
                onClick={() => {
                  if (compareMode) onCompareToggle?.(o.modelId);
                  else onPick(o);
                }}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hocus:bg-bg-2 disabled:cursor-not-allowed disabled:opacity-50',
                  (selected || checked) && 'bg-bg-2',
                )}
              >
                <span
                  className={clsx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-text-inverse',
                    checked ? 'bg-accent-2' : o.free ? 'bg-free/20' : 'bg-bg-3',
                  )}
                  aria-hidden="true"
                >
                  {checked && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className={clsx('text-sm font-medium', o.free ? 'text-free' : 'text-text-0')}>{o.label || o.modelId}</span>
                    {o.provider && !o.free && <span className="text-xs text-text-2">{o.provider}</span>}
                    {badge && <span className="rounded-pill bg-bg-3 px-1.5 py-px text-2xs text-text-1">{badge}</span>}
                  </span>
                  {o.reason && <span className="mt-0.5 block text-xs leading-5 text-text-1">{o.reason}</span>}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <PriceTag micro={o.priceUsd} size="sm" freeLabel tone={o.free ? 'free' : 'price'} />
                  <span className="text-2xs text-text-2">{SPEED[o.speed] ?? o.speed}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="num px-3 pt-2 pb-1 text-2xs tracking-wider-ui text-text-2 uppercase">Quality data: LMArena, Artificial Analysis</p>
    </section>
  );
}
