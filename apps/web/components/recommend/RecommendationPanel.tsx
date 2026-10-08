'use client';

import { useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import type { QuoteResponse, SliderPreset } from '@/lib/api/types';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, reorderLayout, stagger, withReduced } from '@/lib/motion/variants';
import { useDebouncedCallback } from '@/lib/useDebouncedCallback';

import { ClassificationTags } from '@/components/recommend/ClassificationTags';
import { ModelCard } from '@/components/recommend/ModelCard';
import { PresetSlider } from '@/components/recommend/Slider';
import { SuggestionChip } from '@/components/recommend/SuggestionChip';
import { Attribution } from '@/components/ui/Attribution';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export interface RecommendationPanelProps {
  data: QuoteResponse | null;
  loading?: boolean;
  slider: SliderPreset;
  onSliderChange: (preset: SliderPreset) => void;
  selectedModelId: string | null;
  onPick: (modelId: string) => void;
  onAuto: () => void;
  compareMode?: boolean;
  compareIds?: readonly (string | null)[];
  onCompareToggle?: (modelId: string) => void;
  onApplySuggestion?: (modelId: string) => void;
  /** Register card elements for the GlowTrail (index = card order). */
  cardRef?: (modelId: string, el: HTMLDivElement | null) => void;
  /** PDF: 30 free messages/day — the free option is disabled at the cap. */
  freeAvailable?: boolean;
}

/**
 * PDF recommendation set: top 2 by score + best-quality model + free model, each with live price,
 * speed label and a one-line reason; slider re-ranks with layout animation; attribution under it.
 */
export function RecommendationPanel({
  data,
  loading = false,
  slider,
  onSliderChange,
  selectedModelId,
  onPick,
  onAuto,
  compareMode = false,
  compareIds = [],
  onCompareToggle,
  onApplySuggestion,
  cardRef,
  freeAvailable = true,
}: RecommendationPanelProps) {
  const reduced = useReducedMotionSafe();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const debouncedSlider = useDebouncedCallback(onSliderChange, 300);

  const scored = useMemo(() => {
    const recs = data?.recommendations ?? [];
    const paid = recs.filter((r) => !r.is_free);
    const min = Math.min(...paid.map((r) => r.price));
    const max = Math.max(...paid.map((r) => r.price));
    const speedRank = { fast: 1, steady: 0.6, slow: 0.3, unknown: 0.4 } as Record<string, number>;
    return recs.map((r) => ({
      rec: r,
      priceScore: r.is_free ? 1 : max === min ? 1 : 1 - (r.price - min) / (max - min),
      speedScore: speedRank[r.speed_label] ?? 0.4,
    }));
  }, [data]);

  const suggestion = data?.suggestion && data.suggestion.model_id !== dismissed ? data.suggestion : null;
  const suggestionLabel = suggestion ? (data?.recommendations.find((r) => r.model_id === suggestion.model_id)?.label ?? suggestion.model_id) : '';

  return (
    <AnimatePresence mode="wait">
      {(data || loading) && (
        <motion.section
          key={data?.quote.id ?? 'loading'}
          variants={withReduced(stagger({ each: 0.07 }), reduced)}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="space-y-4"
          aria-label="Recommendations"
        >
          <motion.div variants={withReduced(fadeUp, reduced)} className="flex flex-wrap items-center justify-between gap-3">
            {data ? <ClassificationTags c={data.classification} /> : <Skeleton className="h-7 w-48" pill />}
            <Button size="sm" variant="secondary" onClick={onAuto} disabled={!data}>
              Auto · run top pick
            </Button>
          </motion.div>

          <motion.div variants={withReduced(fadeUp, reduced)}>
            <PresetSlider value={slider} onChange={debouncedSlider} disabled={loading} />
          </motion.div>

          <motion.div
            variants={withReduced(fadeUp, reduced)}
            role="listbox"
            aria-label="Model options"
            className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4"
          >
            {loading && !data
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-64 shrink-0 snap-start md:w-auto" />)
              : scored.map(({ rec, priceScore, speedScore }, i) => (
                  <motion.div
                    key={rec.model_id}
                    {...(reduced ? {} : reorderLayout)}
                    className="w-64 shrink-0 snap-start md:w-auto"
                    ref={(el) => cardRef?.(rec.model_id, el)}
                  >
                    <ModelCard
                      rec={rec}
                      rank={i}
                      priceScore={priceScore}
                      speedScore={speedScore}
                      selected={selectedModelId === rec.model_id}
                      compareMode={compareMode}
                      compareChecked={compareIds.includes(rec.model_id)}
                      disabled={loading || (rec.is_free && !freeAvailable)}
                      onPick={onPick}
                      {...(onCompareToggle ? { onCompareToggle } : {})}
                    />
                  </motion.div>
                ))}
          </motion.div>

          <AnimatePresence>
            {suggestion && onApplySuggestion && (
              <SuggestionChip
                key={suggestion.model_id}
                suggestion={suggestion}
                modelLabel={suggestionLabel}
                onApply={onApplySuggestion}
                onDismiss={() => {
                  setDismissed(suggestion.model_id);
                }}
              />
            )}
          </AnimatePresence>

          <Attribution />
        </motion.section>
      )}
    </AnimatePresence>
  );
}
