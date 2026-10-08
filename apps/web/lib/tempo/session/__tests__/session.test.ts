import { webcrypto } from 'node:crypto';

import { micro } from '@/lib/money';

import { MockSessionClient } from '../impl.mock';
import { voucherBytes, voucherSigner } from '../voucherSigner';

beforeAll(() => {
  // jsdom has no SubtleCrypto; use Node's WebCrypto.
  vi.stubGlobal('crypto', webcrypto);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

describe('voucherSigner', () => {
  it('creates a non-extractable key and produces verifiable signatures', async () => {
    const pub = await voucherSigner.publicKeyHex('ch_test');
    expect(pub).toMatch(/^0x04[0-9a-f]{128}$/);
    expect(await voucherSigner.isExtractable('ch_test')).toBe(false);
    const bytes = voucherBytes('ch_test', 900);
    const sig = await voucherSigner.sign('ch_test', bytes);
    expect(await voucherSigner.verify('ch_test', bytes, sig)).toBe(true);
    expect(await voucherSigner.verify('ch_test', voucherBytes('ch_test', 901), sig)).toBe(false);
    await voucherSigner.forget('ch_test');
  });
});

describe('MockSessionClient', () => {
  it('opens, tops up and signs cumulative vouchers', async () => {
    const client = new MockSessionClient();
    const { channelId } = await client.openChannel({ maxDepositMicro: micro(2_000_000), authorizedSigner: '0x04' });
    expect(channelId).toMatch(/^ch_mock_/);
    const v = await client.signVoucher({ channelId, cumulativeMicro: micro(900) });
    expect(v).toMatchObject({ channel_id: channelId, cumulative_amount: 900 });
    expect(await voucherSigner.verify(channelId, voucherBytes(channelId, 900), v.signature)).toBe(true);
    const after = await client.topUp({ channelId, amountMicro: micro(2_000_000) });
    expect(after.depositMicro).toBe(4_000_000);
    expect((await client.status(channelId))?.status).toBe('open');
  });
});
