'use client';

import { Minus, Plus } from 'lucide-react';

import { formatUsd, fromUsd, micro, type MicroUsd } from '@/lib/money';

import { NumberTicker } from '@/components/fx/NumberTicker';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';

export interface AllocationControlsProps {
  allocation: MicroUsd;
  weeklyLimit: MicroUsd;
  autoFreeFallback: boolean;
  onChange: (patch: { allocation?: MicroUsd; weekly_limit?: MicroUsd; auto_free_fallback?: boolean }) => void;
  disabled?: boolean;
}

const ALLOC_STEP = fromUsd(1);
const LIMIT_STEP = fromUsd(5);

function Stepper({ label, hint, value, step, min, max, onChange, disabled, unit }: {
  label: string;
  hint: string;
  value: MicroUsd;
  step: MicroUsd;
  min: MicroUsd;
  max: MicroUsd;
  onChange: (v: MicroUsd) => void;
  disabled: boolean;
  unit?: string;
}) {
  const set = (v: number) => {
    onChange(micro(Math.min(max, Math.max(min, v))));
  };
  return (
    <div className="glass flex items-center justify-between gap-3 rounded-lg p-3">
      <div className="min-w-0">
        <p className="text-sm text-text-0">{label}</p>
        <p className="text-xs text-text-2">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => { set(value - step); }}>
          <Minus size={16} />
        </Button>
        <span className="num w-20 text-center text-lg text-accent-2" aria-live="polite">
          <NumberTicker value={value / 1_000_000} format={(n) => `${formatUsd(micro(Math.round(n * 1_000_000)), { min: 0, max: 0 })}${unit ?? ''}`} />
        </span>
        <Button size="icon" variant="ghost" aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => { set(value + step); }}>
          <Plus size={16} />
        </Button>
      </div>
    </div>
  );
}

/** PDF: allocation size (default $2) and spending limit (e.g. $10/week); auto free fallback (default on). */
export function AllocationControls({ allocation, weeklyLimit, autoFreeFallback, onChange, disabled = false }: AllocationControlsProps) {
  return (
    <div className="space-y-3">
      <Stepper
        label="Allocation size"
        hint="Opens or tops up your session by this amount"
        value={allocation}
        step={ALLOC_STEP}
        min={fromUsd(1)}
        max={fromUsd(50)}
        disabled={disabled}
        onChange={(v) => { onChange({ allocation: v }); }}
      />
      <Stepper
        label="Spending limit"
        hint="Per week, across all sessions"
        value={weeklyLimit}
        step={LIMIT_STEP}
        min={fromUsd(5)}
        max={fromUsd(500)}
        disabled={disabled}
        unit="/wk"
        onChange={(v) => { onChange({ weekly_limit: v }); }}
      />
      <Switch
        label="Auto free fallback"
        description="When the allocation runs out, continue on Free · Llama 3.1 8B and say so"
        checked={autoFreeFallback}
        disabled={disabled}
        onChange={(v) => { onChange({ auto_free_fallback: v }); }}
        className="glass rounded-lg p-3"
      />
    </div>
  );
}
