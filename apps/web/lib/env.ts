import { z } from 'zod';

/**
 * Public runtime config (SmartRouter Frontend Architecture, "Vercel environment variables").
 *
 * The browser needs exactly four public values to reach the live backend and the user's wallet:
 * the API base URL, the Tempo network, its chain id and a public RPC URL. Everything else here
 * is optional tooling (Sentry, feature flags, the offline mock switch for development and tests).
 * Provider keys, the hot wallet and the operator key never exist in this bundle.
 *
 * Each key is referenced literally so Next.js can inline it into the client bundle.
 */
const booleanFlag = z
  .enum(['0', '1', 'true', 'false'])
  .optional()
  .transform((v) => v === '1' || v === 'true');

/** PDF: Tempo mainnet = chain 4217 (`tempo`), Moderato testnet = chain 42431 (`moderato`). */
export const CHAIN_IDS = { tempo: 4217, moderato: 42431 } as const;
export const DEFAULT_RPC_URLS = {
  tempo: 'https://rpc.tempo.xyz',
  moderato: 'https://rpc.moderato.tempo.xyz',
} as const;

const schema = z
  .object({
    apiUrl: z.string().url().transform((u) => u.replace(/\/+$/, '')),
    network: z.enum(['tempo', 'moderato']),
    chainId: z.coerce.number().int().positive().optional(),
    rpcUrl: z.string().url().optional(),
    objectStorageHost: z.string().optional().transform((s) => s ?? ''),
    sentryDsn: z.string().optional().transform((s) => s ?? ''),
    flagCompare: booleanFlag,
    flagMusic: booleanFlag,
    mock: booleanFlag,
  })
  .transform((e) => ({
    ...e,
    chainId: e.chainId ?? CHAIN_IDS[e.network],
    rpcUrl: e.rpcUrl ?? DEFAULT_RPC_URLS[e.network],
  }));

export type Env = z.output<typeof schema>;

const raw = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  network: process.env.NEXT_PUBLIC_TEMPO_NETWORK,
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  objectStorageHost: process.env.NEXT_PUBLIC_OBJECT_STORAGE_HOST,
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  flagCompare: process.env.NEXT_PUBLIC_FLAG_COMPARE ?? '1',
  flagMusic: process.env.NEXT_PUBLIC_FLAG_MUSIC ?? '1',
  mock: process.env.NEXT_PUBLIC_MOCK ?? '0',
};

function parseEnv(input: unknown): Env {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  NEXT_PUBLIC_${camelToScreaming(String(i.path[0] ?? '?'))}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid public environment (see apps/web/.env.example):\n${issues}`);
  }
  return result.data;
}

function camelToScreaming(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toUpperCase();
}

export const env: Env = parseEnv(raw);

/** Moderato is the staging/testnet network: real on-chain payments with faucet pathUSD, mock model text. */
export const isTestnet = env.network === 'moderato';
