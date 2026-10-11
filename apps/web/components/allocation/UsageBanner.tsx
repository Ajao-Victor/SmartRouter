'use client';

import { clsx } from 'clsx';
import { X } from 'lucide-react';

import type { UsageAlert } from '@/lib/api/types';

import { selectVisibleAlert, useUsageStore } from '@/stores/usageStore';

export interface UsageBannerProps {
  /** `top_up` (deposit meter): open the deposit dialog. */
  onTopUp: () => void;
  /** `raise_limit` (weekly meter): open settings to raise `weeklyLimitUsd`. */
  onRaiseLimit: () => void;
  /** `exhausted`: offer the free model. */
  onUseFree?: (() => void) | undefined;
  className?: string;
}

const ACTION_LABEL: Record<UsageAlert['action'], string> = { top_up: 'Top up', raise_limit: 'Raise limit' };

/**
 * Usage banner (Handover "Usage banners"): the backend computes `usage.alert`; this only renders
 * it, formatted like Claude's — "{message} · Get more usage".
 *
 * | level     | shown at | style                                         |
 * | warning   | 75%      | thin bar above the composer, dismissible      |
 * | critical  | 90%      | same bar, stronger colour, not dismissible    |
 * | exhausted | 100%     | blocks paid Send; offers the free model       |
 */
export function UsageBanner({ onTopUp, onRaiseLimit, onUseFree, className }: UsageBannerProps) {
  const alert = useUsageStore(selectVisibleAlert);
  const dismiss = useUsageStore((s) => s.dismiss);
  if (!alert) return null;

  const act = alert.action === 'top_up' ? onTopUp : onRaiseLimit;
  const tone = alert.level === 'warning' ? 'bg-warn/10 text-text-0' : alert.level === 'critical' ? 'bg-warn/20 text-text-0 shadow-hairline-strong' : 'bg-signal/15 text-text-0 shadow-hairline-strong';

  return (
    <div
      role={alert.level === 'warning' ? 'status' : 'alert'}
      data-usage-level={alert.level}
      className={clsx('flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3 py-1.5 text-sm', tone, className)}
    >
      <span className="min-w-0 flex-1">
        {alert.message}
        <span className="text-text-2"> · Get more usage</span>
      </span>
      <span className="flex items-center gap-1">
        <button type="button" onClick={act} className={clsx('rounded-md px-2 py-0.5 text-sm font-medium transition-colors hocus:bg-bg-2', alert.level === 'exhausted' ? 'text-signal' : 'text-warn')}>
          {ACTION_LABEL[alert.action]}
        </button>
        {alert.level === 'exhausted' && onUseFree && (
          <button type="button" onClick={onUseFree} className="rounded-md bg-free/15 px-2 py-0.5 text-sm font-medium text-free transition-colors hocus:bg-free/25">
            Use the free model
          </button>
        )}
        {alert.level === 'warning' && (
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-md p-1 text-text-2 transition-colors hocus:bg-bg-2 hocus:text-text-0">
            <X size={14} />
          </button>
        )}
      </span>
    </div>
  );
}
