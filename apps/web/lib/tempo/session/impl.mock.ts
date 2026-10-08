import type { Voucher } from '@/lib/api/types';
import { micro, type MicroUsd } from '@/lib/money';

import type { ChannelStatus, OpenChannelArgs, SessionClient } from './SessionClient';
import { voucherBytes, voucherSigner } from './voucherSigner';

/**
 * In-memory session client for testnet/mock: no chain, but real WebCrypto voucher signatures.
 * No timers here by design (lint: session code is user-initiated only); SDK-style latency is
 * simulated by the Tempo accounts mock, not the channel.
 */
export class MockSessionClient implements SessionClient {
  private channels = new Map<string, ChannelStatus>();
  private counter = 0;

  constructor(private readonly latencyMs = 0) {}

  openChannel(args: OpenChannelArgs): Promise<{ channelId: string }> {
    this.latencyMs;
    this.counter += 1;
    const channelId = `ch_mock_${String(this.counter).padStart(4, '0')}`;
    this.channels.set(channelId, { channelId, depositMicro: args.maxDepositMicro, status: 'open' });
    return Promise.resolve({ channelId });
  }

  topUp({ channelId, amountMicro }: { channelId: string; amountMicro: MicroUsd }): Promise<ChannelStatus> {
    const ch = this.channels.get(channelId) ?? { channelId, depositMicro: micro(0), status: 'open' as const };
    const next: ChannelStatus = { ...ch, depositMicro: micro(ch.depositMicro + amountMicro), status: 'open' };
    this.channels.set(channelId, next);
    return Promise.resolve(next);
  }

  async signVoucher({ channelId, cumulativeMicro }: { channelId: string; cumulativeMicro: MicroUsd }): Promise<Voucher> {
    const signature = await voucherSigner.sign(channelId, voucherBytes(channelId, cumulativeMicro));
    return { channel_id: channelId, cumulative_amount: cumulativeMicro, signature };
  }

  status(channelId: string): Promise<ChannelStatus | null> {
    return Promise.resolve(this.channels.get(channelId) ?? null);
  }
}
