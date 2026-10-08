'use client';

import { useMemo, useState } from 'react';

import type { Model, Recommendation } from '@/lib/api/types';

import { useModels } from '@/hooks/useModels';
import { useUiStore } from '@/stores/uiStore';


import { HoloCard } from '@/components/fx/HoloCard';
import { Input } from '@/components/ui/Input';
import { PriceTag } from '@/components/ui/PriceTag';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ModelPickerProps {
  /** The 4 recommended options for the current prompt, when a quote exists. */
  recommendations?: Recommendation[];
  currentModelId: string | null;
  onSelect: (modelId: string) => void;
}

/** Sheet listing recommended options first, then the full catalog grouped by provider, with search. */
export function ModelPicker({ recommendations = [], currentModelId, onSelect }: ModelPickerProps) {
  const open = useUiStore((s) => s.activeDialog === 'modelPicker');
  const closeDialog = useUiStore((s) => s.closeDialog);
  const models = useModels();
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const list = (models.data ?? []).filter((m) => m.active && m.verified);
    const needle = q.trim().toLowerCase();
    const filtered = needle ? list.filter((m) => `${m.label} ${m.provider}`.toLowerCase().includes(needle)) : list;
    const byProvider = new Map<string, Model[]>();
    for (const m of filtered) byProvider.set(m.provider, [...(byProvider.get(m.provider) ?? []), m]);
    return [...byProvider.entries()];
  }, [models.data, q]);

  const pick = (id: string) => {
    onSelect(id);
    closeDialog();
  };

  return (
    <Sheet open={open} onClose={closeDialog} title="Switch model">
      <p className="mb-4 text-xs text-text-2">Any turn can name another model; the new model receives the whole thread.</p>
      {recommendations.length > 0 && (
        <section className="mb-5 space-y-2">
          <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Recommended for this prompt</p>
          <div className="grid gap-2">
            {recommendations.map((r) => (
              <HoloCard
                key={r.model_id}
                tone={r.is_free ? 'free' : r.is_best_quality ? 'teal' : 'accent'}
                selected={r.model_id === currentModelId}
                tilt={3}
                className="p-3"
                role="button"
                tabIndex={0}
                onClick={() => {
                  pick(r.model_id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') pick(r.model_id);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text-0">{r.label}</p>
                    <p className="truncate text-xs text-text-2">{r.reason}</p>
                  </div>
                  <PriceTag micro={r.price} size="sm" freeLabel />
                </div>
              </HoloCard>
            ))}
          </div>
        </section>
      )}
      <Input
        label="All models"
        placeholder="Search by model or provider"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
        }}
      />
      <div className="mt-4 space-y-5">
        {models.isPending && (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {groups.map(([provider, list]) => (
          <section key={provider} className="space-y-2">
            <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">
              {provider} <span className="text-text-2/70">· available via MPP</span>
            </p>
            <ul className="space-y-1.5">
              {list.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      pick(m.id);
                    }}
                    aria-pressed={m.id === currentModelId}
                    className="glass hit-44 flex w-full items-center justify-between gap-3 rounded-md px-3 text-left transition-[box-shadow] hocus:shadow-glow-accent aria-pressed:shadow-glow-accent-strong"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-text-0">{m.label}</span>
                      <span className="block truncate text-xs text-text-2">{m.task_types.join(' · ')}</span>
                    </span>
                    <PriceTag micro={m.price_est} size="sm" freeLabel tone={m.payment === 'free' ? 'free' : 'price'} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
