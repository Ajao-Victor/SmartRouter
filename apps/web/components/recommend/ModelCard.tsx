'use client';

import { forwardRef } from 'react';

import { clsx } from 'clsx';
import { Globe, Zap } from 'lucide-react';

import type { Recommendation } from '@/lib/api/types';

import { HoloCard } from '@/components/fx/HoloCard';
import { QualityPriceSpeedBars } from '@/components/recommend/QualityPriceSpeedBars';
import { TypeLine } from '@/components/recommend/TypeLine';
import { Chip } from '@/components/ui/Chip';
import { PriceTag } from '@/components/ui/PriceTag';

export interface ModelCardProps {
  rec: Recommendation;
  rank: number;
  /** Price axis normalised 0..1 (1 = cheapest in the set). */
  priceScore: number;
  speedScore: number;
  selected: boolean;
  compareMode?: boolean;
  compareChecked?: boolean;
  disabled?: boolean;
  onPick: (modelId: string) => void;
  onCompareToggle?: (modelId: string) => void;
}

const speedIcon = { fast: 3, steady: 2, slow: 1, unknown: 0 } as Record<string, number>;

/**
 * One of the four options (top 2, best quality, free): tilting HoloCard with label, "via MPP" /
 * "Free · Llama 3.1 8B", live price, speed chip, typed reason line, quality/price/speed bars and badges.
 */
export const ModelCard = forwardRef<HTMLDivElement, ModelCardProps>(function ModelCard(
  { rec, rank, priceScore, speedScore, selected, compareMode = false, compareChecked = false, disabled = false, onPick, onCompareToggle },
  ref,
) {
  const tone = rec.is_free ? 'free' : rec.is_best_quality ? 'teal' : 'accent';
  const badge = rec.is_free ? 'Free' : rec.is_best_quality ? 'Best quality' : rank === 0 ? 'Top pick' : null;

  return (
    <HoloCard
      ref={ref}
      tone={tone}
      selected={selected}
      className={clsx('flex h-full flex-col gap-3 p-4', disabled && 'opacity-60')}
      role="option"
      aria-selected={selected}
      aria-label={rec.label}
      tabIndex={0}
      onClick={() => {
        if (disabled) return;
        if (compareMode) onCompareToggle?.(rec.model_id);
        else onPick(rec.model_id);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (compareMode) onCompareToggle?.(rec.model_id);
          else onPick(rec.model_id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={clsx('truncate text-sm font-medium', rec.is_free ? 'text-free' : 'text-text-0')}>{rec.label}</p>
          <p className="truncate text-xs text-text-2">{rec.is_free ? rec.provider : `${rec.provider} · via MPP`}</p>
        </div>
        {badge && (
          <Chip tone={tone === 'accent' ? 'accent' : tone} selected className="pointer-events-none h-6 px-2 text-2xs" tabIndex={-1}>
            {badge}
          </Chip>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <PriceTag micro={rec.price} size="lg" freeLabel tone={rec.is_free ? 'free' : 'price'} />
        <span className="num inline-flex items-center gap-1 text-2xs text-text-2" title={`Speed: ${rec.speed_label}`}>
          {Array.from({ length: speedIcon[rec.speed_label] ?? 0 }).map((_, i) => (
            <Zap key={String(i)} size={10} className="text-speed" aria-hidden="true" />
          ))}
          {rec.speed_label}
          {rec.searches_web && <Globe size={12} className="ml-1 text-accent-2" aria-label="Searches the web" />}
        </span>
      </div>

      <p className="min-h-8 text-xs text-text-1">
        <TypeLine text={rec.reason} />
      </p>

      <QualityPriceSpeedBars quality={rec.quality} price={priceScore} speed={speedScore} />

      {compareMode && (
        <label className="mt-1 flex items-center gap-2 text-xs text-text-1">
          <input
            type="checkbox"
            checked={compareChecked}
            onChange={() => {
              onCompareToggle?.(rec.model_id);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="accent-[var(--accent-2)]"
          />
          Compare
        </label>
      )}
    </HoloCard>
  );
});
