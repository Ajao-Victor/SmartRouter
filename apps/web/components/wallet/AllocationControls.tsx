'use client';

import { Minus, Plus } from 'lucide-react';

import type { SettingsPatch } from '@/lib/api/types';
import { formatUsd, fromUsd, micro, toUsd, type MicroUsd } from '@/lib/money';

import { Switch } from '@/components/ui/Switch';

export interface AllocationControlsProps {
  allocationUsd: MicroUsd;
  weeklyLimitUsd: MicroUsd;
  autoFreeFallback: boolean;
  onChange: (patch: SettingsPatch) => void;
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
  const btn = 'flex h-9 w-9 items-center justify-center rounded-md text-text-1 transition-colors hocus:bg-bg-2 hocus:text-text-0 disabled:opacity-40';
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-bg-1 p-3 shadow-hairline">
      <div className="min-w-0">
        <p className="text-sm text-text-0">{label}</p>
        <p className="text-xs text-text-2">{hint}</p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={btn} aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => { set(value - step); }}>
          <Minus size={16} />
        </button>
        <span className="num w-20 text-center text-base text-text-0" aria-live="polite">
          {formatUsd(value, { min: 0, max: 2 })}
          {unit ?? ''}
        </span>
        <button type="button" className={btn} aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => { set(value + step); }}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Settings (`PATCH /me/settings`): allocation size = preferred deposit (0.5–100, default $2),
 * weekly spending limit (0–1000, e.g. $10/week), auto free fallback (default on).
 */
export function AllocationControls({ allocationUsd, weeklyLimitUsd, autoFreeFallback, onChange, disabled = false }: AllocationControlsProps) {
  return (
    <div className="space-y-2">
      <Stepper
        label="Allocation size"
        hint="Preferred deposit, used the next time a deposit opens"
        value={allocationUsd}
        step={ALLOC_STEP}
        min={fromUsd(0.5)}
        max={fromUsd(100)}
        disabled={disabled}
        onChange={(v) => { onChange({ allocationUsd: toUsd(v) }); }}
      />
      <Stepper
        label="Spending limit"
        hint="Per week, across all sessions"
        value={weeklyLimitUsd}
        step={LIMIT_STEP}
        min={fromUsd(0)}
        max={fromUsd(1000)}
        disabled={disabled}
        unit="/wk"
        onChange={(v) => { onChange({ weeklyLimitUsd: toUsd(v) }); }}
      />
      <Switch
        label="Auto free fallback"
        description="When the allocation runs out, continue on the free model and say so"
        checked={autoFreeFallback}
        disabled={disabled}
        onChange={(v) => { onChange({ autoFreeFallback: v }); }}
        className="rounded-lg bg-bg-1 p-3 shadow-hairline"
      />
    </div>
  );
}
