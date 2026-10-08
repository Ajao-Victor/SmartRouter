'use client';

import { formatUsd, type MicroUsd } from '@/lib/money';

import { useAllocationStore } from '@/stores/allocationStore';
import { useUiStore } from '@/stores/uiStore';

import { MagneticButton } from '@/components/ui/MagneticButton';
import { Sheet } from '@/components/ui/Sheet';
import { AllocationControls, type AllocationControlsProps } from '@/components/wallet/AllocationControls';
import { BalanceList, type TokenBalance } from '@/components/wallet/BalanceList';
import { ComingSoonCard } from '@/components/wallet/ComingSoonCard';
import { DepositButton, SwapButton } from '@/components/wallet/DepositButton';
import { SpendPermissionCard, type SpendPermissionCardProps } from '@/components/wallet/SpendPermissionCard';

export interface WalletSheetProps {
  address: string | null;
  balances: TokenBalance[] | undefined;
  balancesLoading?: boolean;
  onDeposit: () => void;
  onSwap: () => void;
  swapNeeded: boolean;
  controls: AllocationControlsProps;
  permission: SpendPermissionCardProps;
  onOpenAllocation: () => void;
  onTopUp: () => void;
  /** Unspent amount returned when the last session closed (PDF: idle 24 h → funds return). */
  returnedMicro?: MicroUsd | null;
}

/**
 * Wallet sheet (UI_UX_Brief §5): balances → Deposit / Swap to USDC.e → allocation controls →
 * spend permission → coming-soon cards. Balances come from Tempo (never stored); handlers are
 * wired to the SDK in Tasks 19–20.
 */
export function WalletSheet({
  address,
  balances,
  balancesLoading = false,
  onDeposit,
  onSwap,
  swapNeeded,
  controls,
  permission,
  onOpenAllocation,
  onTopUp,
  returnedMicro = null,
}: WalletSheetProps) {
  const open = useUiStore((s) => s.walletSheetOpen);
  const toggleWallet = useUiStore((s) => s.toggleWallet);
  const status = useAllocationStore((s) => s.status);

  return (
    <Sheet
      open={open}
      onClose={() => {
        toggleWallet(false);
      }}
      title="Wallet"
    >
      <div className="space-y-6 pb-4">
        {address && <p className="num text-2xs text-text-2">{address}</p>}
        {returnedMicro !== null && returnedMicro > 0 && (
          <p role="status" className="glass rounded-pill px-4 py-2 text-sm text-accent-2">
            Returned {formatUsd(returnedMicro)} from closed allocation
          </p>
        )}
        <BalanceList balances={balances} loading={balancesLoading} />
        <div className="flex gap-3">
          <DepositButton onClick={onDeposit} />
          {swapNeeded && <SwapButton onClick={onSwap} />}
        </div>
        <section className="space-y-3">
          <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Agent allocation</p>
          <AllocationControls {...controls} />
          {status === 'none' || status === 'closed' ? (
            <MagneticButton className="w-full" onClick={onOpenAllocation}>
              Open allocation · {formatUsd(controls.allocation, { min: 0 })}
            </MagneticButton>
          ) : (
            <MagneticButton className="w-full" variant="secondary" onClick={onTopUp} loading={status === 'toppingUp'}>
              Top up {formatUsd(controls.allocation, { min: 0 })}
            </MagneticButton>
          )}
        </section>
        <SpendPermissionCard {...permission} />
        <section className="space-y-3">
          <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Coming soon</p>
          <ComingSoonCard interest="naira" />
          <ComingSoonCard interest="credits" />
        </section>
      </div>
    </Sheet>
  );
}
