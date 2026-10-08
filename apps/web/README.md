# SmartRouter — web app (`apps/web`)

Next.js 15 (App Router) frontend for SmartRouter: tell it what you want done, it picks the best AI for
your budget, and you pay per use from your embedded Tempo wallet via MPP.

## Run

```bash
pnpm install                       # from the repo root (pnpm workspace)
cp apps/web/.env.example apps/web/.env.local
cd apps/web
NEXT_PUBLIC_MOCK=1 pnpm dev        # fully offline on MSW mocks of the proposed API
```

Open http://localhost:3000. Dev-only galleries: `/dev/tokens`, `/dev/primitives`, `/dev/fx`.

## Checks

| Command | What |
|---|---|
| `pnpm lint` | ESLint (strict type-checked, a11y, import order, Web3 safety rules) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest + Testing Library |
| `pnpm test:e2e` | Playwright (mobile + desktop) against mocks |
| `pnpm guard:hosts` | Fails if any MPP provider host appears in the frontend |
| `scripts/ci.sh` | All of the above plus `pnpm build` |

## Environment

All keys are public (`NEXT_PUBLIC_*`): API URL, Tempo network, SmartRouter payee and USDC.e addresses,
object-storage host, Sentry DSN, fee hint, feature flags (`FLAG_COMPARE`, `FLAG_MUSIC`), `MOCK`.
No provider, treasury or hot-wallet keys ever exist in this app. See `.env.example`.

## Content Security Policy

`next.config.ts` emits a CSP: `connect-src` is the API + Sentry + `NEXT_PUBLIC_TEMPO_ORIGINS`;
`frame-src` is `'self'` + the Tempo origins (the SDK's dialog mechanics — iframe or popup — are
unconfirmed, see `Backend_Gaps_Report.md` §8). Verify in the browser console on testnet once the
real Tempo Accounts SDK is wired: any blocked origin shows up as a CSP violation.

## Monitoring

Sentry initialises only when `NEXT_PUBLIC_SENTRY_DSN` is set. `sendDefaultPii` is off; prompts,
wallet traffic breadcrumbs and hex addresses/hashes are scrubbed before send.

## Where things live

See `architecture.md` at the repo root. Backend facts come from the architecture PDF; proposed
endpoints are isolated in `lib/api/endpoints.ts` and mocked in `tests/mocks/`.
