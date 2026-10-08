'use client';

import { SLIDER_WEIGHTS, type SliderPreset } from '@/lib/api/types';

import { Slider } from '@/components/ui/Slider';
import { Tooltip } from '@/components/ui/Tooltip';

const PRESETS: SliderPreset[] = ['cheapest', 'balanced', 'best'];
const LABELS: Record<SliderPreset, string> = { cheapest: 'Cheapest', balanced: 'Balanced', best: 'Best quality' };

export interface PresetSliderProps {
  value: SliderPreset;
  onChange: (preset: SliderPreset) => void;
  disabled?: boolean;
  className?: string;
}

/** Price-vs-quality slider with the PDF's three detents and their (quality, price, speed) weights. */
export function PresetSlider({ value, onChange, disabled = false, className }: PresetSliderProps) {
  const w = SLIDER_WEIGHTS[value];
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between">
        <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Price vs quality</p>
        <Tooltip content={`Weights · quality ${String(w.quality)} · price ${String(w.price)} · speed ${String(w.speed)}`}>
          <span className="num cursor-help text-2xs text-text-2" tabIndex={0}>
            q {w.quality} · p {w.price} · s {w.speed}
          </span>
        </Tooltip>
      </div>
      <Slider
        detents={PRESETS.map((p) => ({ label: LABELS[p] }))}
        value={PRESETS.indexOf(value)}
        onChange={(i) => {
          onChange(PRESETS[i] ?? 'balanced');
        }}
        aria-label="Price versus quality"
        disabled={disabled}
      />
    </div>
  );
}
