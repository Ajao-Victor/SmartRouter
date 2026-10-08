import { z } from 'zod';

/**
 * Public runtime config, validated once at import time.
 *
 * Only `NEXT_PUBLIC_*` keys exist here — addresses, URLs, DSNs and flags.
 * Provider, treasury and hot-wallet keys never reach the browser (security.md §8).
 *
 * Each key is referenced literally so Next.js can inline it into the client bundle.
 */
const booleanFlag = z
  .enum(['0', '1', 'true', 'false'])
  .optional()
  .transform((v) => v === '1' || v === 'true');

const hexAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'expected a 0x-prefixed 20-byte hex address');

const schema = z.object({
  apiUrl: z.string().url().transform((u) => u.replace(/\/+$/, '')),
  network: z.enum(['testnet', 'mainnet']),
  smartrouterPayee: hexAddress,
  usdceAddress: hexAddress,
  tempoOrigins: z
    .string()
    .optional()
    .transform((s) => (s ?? '').split(',').map((o) => o.trim()).filter(Boolean)),
  objectStorageHost: z.string().optional().transform((s) => s ?? ''),
  sentryDsn: z.string().optional().transform((s) => s ?? ''),
  /** Display-only fee hint; the API's quote is authoritative. PDF: 10% → 1000 bps. */
  feeBps: z.coerce.number().int().min(0).max(10_000).default(1000),
  flagCompare: booleanFlag,
  flagMusic: booleanFlag,
  mock: booleanFlag,
});

export type Env = z.output<typeof schema>;

const raw = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  network: process.env.NEXT_PUBLIC_TEMPO_NETWORK,
  smartrouterPayee: process.env.NEXT_PUBLIC_SMARTROUTER_PAYEE,
  usdceAddress: process.env.NEXT_PUBLIC_USDCE_ADDRESS,
  tempoOrigins: process.env.NEXT_PUBLIC_TEMPO_ORIGINS,
  objectStorageHost: process.env.NEXT_PUBLIC_OBJECT_STORAGE_HOST,
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  feeBps: process.env.NEXT_PUBLIC_FEE_BPS,
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

export const isTestnet = env.network === 'testnet';
