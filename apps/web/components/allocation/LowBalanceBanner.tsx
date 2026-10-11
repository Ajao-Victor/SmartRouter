'use client';

import { formatUsd, type MicroUsd } from '@/lib/money';

import { selectIsLow, useAllocationStore } from '@/stores/allocationStore';

export interface LowBalanceBannerProps {
  /** Price of the next quoted run, if known — low also means "below the next price". */
  nextPriceUsd?: MicroUsd | null;
  onTopUp: () => void;
  toppingUp?: boolean;
}

/** PDF: "Your balance is running low · Top up" when remaining < ~10% of the deposit or below the next price. */
export function LowBalanceBanner({ nextPriceUsd = null, onTopUp, toppingUp = false }: LowBalanceBannerProps) {
  const low = useAllocationStore(selectIsLow);
  const remaining = useAllocationStore((s) => s.remainingUsd);
  const status = useAllocationStore((s) => s.status);
  const belowNext = status === 'open' && nextPriceUsd !== null && nextPriceUsd > 0 && remaining < nextPriceUsd;
  if (!low && !belowNext) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warn/10 px-3 py-2 text-sm text-text-0">
      <span>
        Your balance is running low <span className="num text-text-2">({formatUsd(remaining)} left)</span>
      </span>
      <button type="button" onClick={onTopUp} disabled={toppingUp} className="rounded-md px-2 py-1 text-sm font-medium text-warn transition-colors hocus:bg-warn/15 disabled:opacity-60">
        {toppingUp ? 'Topping up…' : 'Top up'}
      </button>
    </div>
  );
}
