'use client';

import { useEffect, useMemo, useState } from 'react';

import { clsx } from 'clsx';
import { Check, Search } from 'lucide-react';

import type { CatalogModel, Option, SliderPreset, TaskType } from '@/lib/api/types';

import { useCatalog } from '@/hooks/useCatalog';
import { useRecommend } from '@/hooks/useQuote';
import { useUiStore } from '@/stores/uiStore';

import { ModelOptions } from '@/components/chat/ModelOptions';
import { PriceTag } from '@/components/ui/PriceTag';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ModelPickerProps {
  currentModelId: string | null;
  /** The draft prompt — when present the sheet asks `POST /recommend` for options. */
  prompt?: string;
  slider?: SliderPreset;
  taskType?: TaskType | null;
  onSelect: (modelId: string) => void;
  compareMode?: boolean;
  compareIds?: readonly (string | null)[];
  onCompareToggle?: (modelId: string) => void;
}

/** Sheet: options recommended for the prompt first, then the whole catalogue grouped by provider. */
export function ModelPicker({ currentModelId, prompt = '', slider, taskType = null, onSelect, compareMode = false, compareIds = [], onCompareToggle }: ModelPickerProps) {
  const open = useUiStore((s) => s.activeDialog === 'modelPicker');
  const closeDialog = useUiStore((s) => s.closeDialog);
  const catalog = useCatalog(taskType ?? undefined, open);
  const recommend = useRecommend();
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    if (!open || !prompt) {
      setOptions([]);
      return;
    }
    recommend.mutate({ prompt, ...(slider ? { slider } : {}), ...(taskType ? { taskType } : {}) }, { onSuccess: setOptions, onError: () => { setOptions([]); } });
    // Re-run only when the sheet opens for a new prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prompt]);

  const groups = useMemo(() => {
    const list = catalog.data ?? [];
    const needle = q.trim().toLowerCase();
    const filtered = needle ? list.filter((m) => `${m.label} ${m.provider} ${m.modelId}`.toLowerCase().includes(needle)) : list;
    const byProvider = new Map<string, CatalogModel[]>();
    for (const m of filtered) byProvider.set(m.provider || 'Other', [...(byProvider.get(m.provider || 'Other') ?? []), m]);
    return [...byProvider.entries()];
  }, [catalog.data, q]);

  const pick = (id: string) => {
    if (compareMode) {
      onCompareToggle?.(id);
      return;
    }
    onSelect(id);
    closeDialog();
  };

  return (
    <Sheet open={open} onClose={closeDialog} title={compareMode ? 'Pick two models to compare' : 'Choose a model'}>
      <p className="mb-4 text-xs text-text-2">The next turn runs on the model you pick; it receives the whole thread. Every price is quoted before you send.</p>

      {prompt && (recommend.isPending || options.length > 0) && (
        <div className="mb-5">
          {recommend.isPending ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <ModelOptions
              title="Recommended for this message"
              options={options}
              selectedId={currentModelId}
              onPick={(o) => {
                pick(o.modelId);
              }}
              compareMode={compareMode}
              compareIds={compareIds}
              {...(onCompareToggle ? { onCompareToggle } : {})}
            />
          )}
        </div>
      )}

      <label className="flex h-10 items-center gap-2 rounded-lg bg-bg-2 px-3 text-sm text-text-0 shadow-hairline focus-within:shadow-glow-accent">
        <Search size={16} className="text-text-2" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search models or providers"
          aria-label="Search models"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
          }}
          className="w-full bg-transparent outline-none placeholder:text-text-2"
        />
      </label>

      <div className="mt-4 space-y-5 pb-2">
        {catalog.isPending && (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        )}
        {catalog.isError && <p className="text-sm text-signal">Could not load the catalogue.</p>}
        {groups.map(([provider, list]) => (
          <section key={provider} className="space-y-1">
            <p className="num px-1 text-2xs tracking-wider-ui text-text-2 uppercase">{provider}</p>
            <ul className="space-y-0.5">
              {list.map((m) => {
                const active = compareMode ? compareIds.includes(m.modelId) : m.modelId === currentModelId;
                return (
                  <li key={m.modelId}>
                    <button
                      type="button"
                      onClick={() => {
                        pick(m.modelId);
                      }}
                      aria-pressed={active}
                      className={clsx('flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hocus:bg-bg-2', active && 'bg-bg-2')}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={clsx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full', active ? 'bg-accent-2 text-text-inverse' : 'bg-bg-3')} aria-hidden="true">
                          {active && <Check size={10} />}
                        </span>
                        <span className="min-w-0">
                          <span className={clsx('block truncate text-sm', m.free ? 'text-free' : 'text-text-0')}>{m.label}</span>
                          {m.taskTypes.length > 0 && <span className="block truncate text-xs text-text-2">{m.taskTypes.join(' · ')}</span>}
                        </span>
                      </span>
                      <PriceTag micro={m.priceUsd} size="sm" freeLabel tone={m.free ? 'free' : 'price'} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {catalog.data && groups.length === 0 && <p className="text-sm text-text-2">No model matches.</p>}
      </div>
    </Sheet>
  );
}
