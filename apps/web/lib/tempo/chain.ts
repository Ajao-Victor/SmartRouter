import { defineChain, type Chain } from 'viem';
import { tempo, tempoModerato } from 'viem/chains';

import { env } from '@/lib/env';

const withRpc = (c: Chain): Chain => ({ ...c, rpcUrls: { ...c.rpcUrls, default: { http: [env.rpcUrl] } } });

/** viem chain for the configured Tempo network (`tempo` 4217 / `moderato` 42431) on the public RPC. */
export const chain: Chain = withRpc(env.network === 'tempo' ? tempo : tempoModerato);

/**
 * The chain to build the wallet client on (Handover "Paid messages", step 2: the chain in
 * `network.chainId` from `GET /sessions/current`). Falls back to the configured network.
 */
export function chainFor(chainId: number | null | undefined): Chain {
  if (!chainId || chainId === chain.id) return chain;
  if (chainId === tempo.id) return tempo;
  if (chainId === tempoModerato.id) return tempoModerato;
  return defineChain({ id: chainId, name: `Tempo ${String(chainId)}`, nativeCurrency: chain.nativeCurrency, rpcUrls: { default: { http: [env.rpcUrl] } } });
}
