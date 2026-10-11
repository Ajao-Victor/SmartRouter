import { env, isTestnet } from '@/lib/env';

/**
 * PDF: on Moderato (testnet) paid models answer with mock text while payments are real
 * (pathUSD from the faucet). Also flags a fully mocked API (`NEXT_PUBLIC_MOCK=1`).
 */
export function TestnetBanner() {
  if (!isTestnet && !env.mock) return null;
  return (
    <div role="status" className="relative z-content flex h-7 items-center justify-center border-b border-warn/30 bg-warn/10 text-center">
      <span className="num text-2xs tracking-wider-ui text-warn uppercase">
        {env.mock ? 'Mock API — nothing here is on-chain' : 'Testnet · Moderato — real pathUSD payments, mock model answers'}
      </span>
    </div>
  );
}
