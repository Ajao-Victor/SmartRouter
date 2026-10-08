import { isTestnet } from '@/lib/env';

/** PDF: paid models run on the mock adapter on testnet. Visible whenever the network is testnet. */
export function TestnetBanner() {
  if (!isTestnet) return null;
  return (
    <div
      role="status"
      className="bg-stripes-warn relative z-content flex h-7 items-center justify-center bg-bg-1 text-center"
    >
      <span className="num rounded-pill bg-bg-0/80 px-3 py-0.5 text-2xs tracking-wider-ui text-warn uppercase">
        Testnet — paid models run on mock
      </span>
    </div>
  );
}
