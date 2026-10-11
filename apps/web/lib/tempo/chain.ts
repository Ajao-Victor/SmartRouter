import { createClient, http, type Client } from 'viem';
import { tempo, tempoModerato } from 'viem/chains';

import { env } from '@/lib/env';

/** viem chain for the configured Tempo network (PDF: `tempo` 4217 / `moderato` 42431). */
export const chain = env.network === 'tempo' ? tempo : tempoModerato;

let client: Client | null = null;

/** One viem client on the public RPC (PDF: the frontend only needs a public RPC for the wallet). */
export function getChainClient(): Client {
  client ??= createClient({ chain, transport: http(env.rpcUrl) });
  return client;
}

export const explorerUrl = chain.blockExplorers.default.url;
