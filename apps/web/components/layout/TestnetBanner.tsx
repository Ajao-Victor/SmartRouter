import { env, isTestnet } from '@/lib/env';

/**
 * PDF: paid models run on the mock adapter on testnet. Visible whenever the network is testnet;
 * says so explicitly when the whole API is mocked (`NEXT_PUBLIC_MOCK=1`) so nobody mistakes
 * mock balances for real ones.
 */
export function TestnetBanner() {
  if (!isTestnet && !env.mock) return null;
  return (
    <div
      role="status"
      className="bg-stripes-warn relative z-content flex h-7 items-center justify-center bg-bg-1 text-center"
    >
      <span className="num rounded-pill bg-bg-0/80 px-3 py-0.5 text-2xs tracking-wider-ui text-warn uppercase">
        {env.mock ? 'Mock API — nothing here is on-chain' : 'Testnet — paid models run on mock'}
      </span>
    </div>
  );
}
