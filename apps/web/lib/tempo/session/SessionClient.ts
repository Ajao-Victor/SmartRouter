/**
 * Browser-side MPP session client (PDF: open a session channel with SmartRouter,
 * `maxDeposit` = allocation; register the local voucher signer as `authorizedSigner`;
 * sign cumulative vouchers per request; top up without closing).
 *
 * GAP (Backend_Gaps_Report §3.1): the concrete package is unconfirmed, so the app codes to
 * this interface. `impl.mock.ts` runs on testnet/mock; `impl.tempo.ts` is the drop-in slot.
 */
import type { Voucher } from '@/lib/api/types';
import type { MicroUsd } from '@/lib/money';

export interface OpenChannelArgs {
  maxDepositMicro: MicroUsd;
  authorizedSigner: string;
}

export interface ChannelStatus {
  channelId: string;
  depositMicro: MicroUsd;
  status: 'open' | 'closed';
}

export interface SessionClient {
  openChannel(args: OpenChannelArgs): Promise<{ channelId: string }>;
  /** Top-up keeps the channel open (PDF). Only ever called from a user click. */
  topUp(args: { channelId: string; amountMicro: MicroUsd }): Promise<ChannelStatus>;
  /** Sign the cumulative voucher total for this channel (prompt-free). */
  signVoucher(args: { channelId: string; cumulativeMicro: MicroUsd }): Promise<Voucher>;
  status(channelId: string): Promise<ChannelStatus | null>;
}
