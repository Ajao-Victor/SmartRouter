# SmartRouter — Codebase Rules (Frontend)

These rules are mandatory for every file under `apps/web`. They exist so a 4-day build stays correct around money.

---

## 1. Language & types

1. **TypeScript strict** (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`). No `any`; use `unknown` and narrow.
2. API DTOs come from the shared package (PDF: web imports shared types from the API). **Never redeclare** a DTO locally; extend with `Pick`/`Omit` only.
3. Money is **integer micro-USD** everywhere (PDF). Type alias `MicroUsd = number & { __brand: 'MicroUsd' }`. Formatting only in `lib/money.ts`. Never `parseFloat` a price for logic.
4. Zod-validate: env (`lib/env.ts`), SSE event payloads, form inputs, deep-link params.
5. Prefer discriminated unions for message/stream status: `'idle' | 'streaming' | 'done' | 'error' | 'retrying'`.

## 2. Files & naming

- Components: `PascalCase.tsx`, one exported component per file, co-located `*.test.tsx`.
- Hooks: `useX.ts` in `hooks/`. Stores: `xStore.ts` in `stores/`.
- Motion variants: `lib/motion/variants.ts`; no inline variant objects larger than three keys.
- Max file length 250 lines; split otherwise.
- Imports ordered: react/next → third-party → `@/lib` → `@/stores` → `@/hooks` → `@/components` → relative. Enforced by `eslint-plugin-import`.

## 3. ESLint / Prettier

`eslint.config.js` extends: `next/core-web-vitals`, `@typescript-eslint/strict-type-checked`, `plugin:jsx-a11y/recommended`, `plugin:import/recommended`, `plugin:react-hooks/recommended`.

Additional rules (error level):
- `no-restricted-imports`: ban `window.ethereum` direct use; ban `localStorage` (use IndexedDB helper or Zustand memory).
- `no-restricted-syntax`: ban `setInterval` calling anything in `lib/tempo/session/*` (no auto top-ups — PDF).
- `@typescript-eslint/no-floating-promises`, `no-misused-promises`.
- `react/jsx-no-target-blank`.
- Custom lint (script): fail build if any `mpp.tempo.xyz`, `paywithlocus.com` or `stablestudio.dev` string appears in `apps/web`.

Prettier: 2 spaces, single quotes, no semicolons off (semicolons **on**), trailing commas `all`, print width 100.

## 4. State management guidelines

1. **Server state → TanStack Query. Client state → Zustand. Never both for the same datum.**
2. Query keys are defined once in `lib/api/keys.ts`; components never write key arrays inline.
3. Quotes are cached with `gcTime: 5 * 60_000` and `staleTime: 0`; a quote past `expires_at` is never submitted — re-quote.
4. Streams are written to `streamStore` by the SSE parser only; components read via selectors. Batch token appends with `requestAnimationFrame`.
5. Stores expose actions, not setters: `allocationStore.applyVoucher(amount)`, not `set({remaining})`.
6. No derived state stored; compute with selectors (`remainingPct`, `isLow`).
7. Reset all stores on logout.
8. Private key material never enters any store, context, or React state. Only a public key / channel id / running total.

## 5. Web3 best practices (PDF-aligned)

1. **One SDK**: all wallet UX through the Tempo Accounts SDK + Tempo Wallet adapter.
2. **Scoped spend permission only**: token USDC.e, payee SmartRouter, calls open + top-up, expiry. Show these before approval. Provide Revoke.
3. **No automatic top-ups**. Top-up is called only from a click handler on a visible button.
4. **Voucher amount = server quote price**. Never computed client-side.
5. **Cumulative vouchers** tracked per channel; refuse to exceed deposit.
6. **Balances from Tempo**, never cached beyond a 15 s query window; never persisted.
7. **No gas UI**: fees are sponsored; never show a gas estimate.
8. **Validate** tx hashes and addresses before rendering or linking.
9. **Testnet awareness**: a visible banner when `NEXT_PUBLIC_TEMPO_NETWORK=testnet`.
10. **Honest labels**: "available via MPP"; "Free · Llama 3.1 8B"; attribution under recommendations.

## 6. Components & styling

- Tailwind utility classes with design tokens (`bg-[var(--bg-1)]` via theme mapping — prefer `bg-bg-1`). No hard-coded hex in components.
- Variants via `class-variance-authority`; conditional classes via `clsx`.
- Every interactive element: visible focus ring (`focus-visible:ring-2 ring-accent`), ≥ 44px hit target on mobile.
- Dialogs/sheets trap focus and restore it on close.
- Icons from `lucide-react`, size 16/20/24 only.

## 7. Motion rules

- Use `motion/react`; all variants live in `lib/motion/variants.ts`; springs in `lib/motion/springs.ts`.
- Wrap conditional UI in `AnimatePresence` with stable `key`s.
- Every animated component reads `useReducedMotionSafe()` and provides a fade-only fallback.
- WebGL components: `dynamic(() => import(...), { ssr: false })`; mount only when `canvas.getContext('webgl2')` succeeds and `navigator.hardwareConcurrency >= 4`; otherwise CSS fallback.
- Do not animate `width/height/top/left`; animate `transform`/`opacity`; use `layout` prop for reflow.
- Cap simultaneous particle systems at one.

## 8. Data fetching & errors

- Single `apiFetch` wrapper: base URL, `credentials: 'include'`, `X-Requested-With`, JSON parse, `ApiError {status, code, message, retryAfter?}`.
- Map 401 → sign-in prompt; 402/`allocation` → TopUpBar; 429 → cooldown; 5xx → toast + Sentry.
- SSE: handle `heartbeat` (15 s) with a 45 s watchdog → mark `error` and offer rerun.
- Never swallow errors; every `catch` either rethrows, maps to UI state, or reports to Sentry.

## 9. Security rules (see `security.md`)

- Markdown renderer with sanitisation; no `dangerouslySetInnerHTML` except inside `lib/markdown.ts`.
- Attachment allowlist + size check before upload.
- No secrets in `NEXT_PUBLIC_*` beyond addresses/URLs/DSN.

## 10. Testing

- Unit: `lib/money.ts` (rounding up to $0.0001), `lib/api/sse.ts` (all event types, heartbeat watchdog), stores (allocation math, cumulative voucher guard).
- Component: RecommendationPanel (4 cards, slider re-rank), TopUpBar (both buttons, auto-free), AllocationHUD states.
- E2E (Playwright, mocked API): demo path deposit → allocation → task → recommendation → result → top-up → receipt.
- `pnpm lint && pnpm typecheck && pnpm test` must pass before every commit.

## 11. Git

- Conventional commits: `feat(web): …`, `fix(web): …`, `docs: …`, `chore(web): …`, `style(web): …`, `test(web): …`.
- **One commit per task step** (atomic); never squash unrelated files.
- Branch names: `feat/<task-number>-<slug>`.

## 12. Definition of done (per task)

- Compiles, lint clean, tests for the task's logic pass.
- Works on 360×780 viewport and ≥ 1280.
- Reduced-motion fallback verified.
- `memory.md` updated with the task's decisions.
