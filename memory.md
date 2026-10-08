# memory.md — SmartRouter frontend context ledger

> Living document. The agent updates this after every task (see `agent.md` §2). Newest entries at the top of each section. Dates are absolute.

---

## Project snapshot

- **Product:** SmartRouter — AI model marketplace; pay per use from an embedded Tempo wallet via MPP. Source of truth: `SmartRouter — Build Architecture 2.pdf` (Oct 7, 2026, @0xAristos).
- **Repo:** https://github.com/Ajao-Victor/SmartRouter (remote `origin`, branch `main`).
- **Deadline:** live by Oct 11, 2026; submission Oct 12, 2026 (Colosseum). Docs generated Oct 8, 2026.
- **Frontend home:** `apps/web` (Next.js + Tailwind, mobile-first, PWA later), calling the Hono API.
- **Cut order if slipping:** Compare mode, then music (feature flags `NEXT_PUBLIC_FLAG_COMPARE`, `NEXT_PUBLIC_FLAG_MUSIC`).

## Fixed numbers (from PDF — never change without a PDF update)

| Item | Value |
|---|---|
| Default allocation | $2 |
| Spending limit example | $10/week |
| Per-user cap | $5/day |
| SmartRouter fee | 10%, price rounded up to $0.0001 |
| Quote validity | 5 minutes, tied to exact prompt |
| SSE heartbeat | every 15 s |
| Free model | Llama 3.1 8B (Cloudflare Workers AI); Groq free tier backup |
| Free limits | 30 messages/user/day; 4,000 history / 512 reply tokens; $3/day all users; text only |
| Paid history cap | 8,000 tokens; older turns summarised by the free model |
| Reply caps | 1,024 tokens short / 4,096 long |
| Rate limit | 30 requests/min per user |
| Settlement | every $1 of usage or hourly |
| Idle session close | 24 h |
| Slider presets (q,p,s) | Cheapest (0.2,0.7,0.1) · Balanced (0.45,0.4,0.15) · Best quality (0.8,0.1,0.1) |
| Recommendation set | top 2 by score + best quality + free (4 options) |
| Providers | OpenAI, Anthropic, OpenRouter, DeepSeek, Mistral AI, Groq, Perplexity, fal.ai, StableStudio, Suno (~40 models) |
| Task categories | chat, writing, coding, research, translation, image, music |

## Status board

| Phase | Status |
|---|---|
| Docs suite (12 files) | ✅ generated Oct 8, 2026 |
| Phase 0 Alignment | ⬜ |
| Phase 1 Setup | 🟡 Tasks 1–5 done (Oct 8, 2026); Tasks 6–8 next |
| Phase 2 Core UI | ⬜ |
| Phase 3 Integration | ⬜ |
| Phase 4 Polish | ⬜ |

## Completed features

- **Task 5 (2026-10-08) — state management.** Six Zustand slices in `stores/`: `uiStore` (dialog stack, wallet sheet, compare mode, `theme`, `forceReducedMotion`, `sdkDialogOpen`, `hydrated`; persists only theme + reduced-motion to IndexedDB via `persist` + `skipHydration`), `composerStore` (draft, attachments with MIME allowlist / 10 MB placeholder / max 4, category, slider override, selected model, compare slots), `allocationStore` (mirrors `user_sessions`: deposit, remaining = deposit − highest_voucher, status none/open/used/toppingUp/closed, `applyVoucher`/`restoreVoucher`/top-up cycle; selectors `remainingPct`, `isLow` < 25%, `isUsed`, `canAfford`), `signerStore` (public key, channel, cumulative total, deposit cap; `advance()` throws `VoucherCapError` above the deposit; `rollback()`; no key material), `streamStore` (per-message token buffers, status idle/streaming/done/error/retrying, heartbeat, retry, file, job; `selectActivity` 0..1 for the orb/field), `walletStore` (SDK status idle→initialising→connecting→signing→connected/error, address, `sessionReady`; balances deliberately excluded). `stores/index.ts` exports `resetAllStores()` for logout. `lib/idb.ts`: fail-safe IndexedDB KV + Zustand async storage adapter. `components/layout/PreferencesProvider.tsx`: rehydrates `uiStore` after mount, flips `hydrated`, applies `data-theme` to `<html>`, feeds `forceReducedMotion` into `ReducedMotionProvider`. Verified: lint, typecheck, 59 tests (11 files), build.

- **Task 4 (2026-10-08) — motion architecture.** `lib/motion/springs.ts`: seven springs — snappy (500/32/0.6), soft (170/26), liquid (90/18/1.2), magnet (300/20), bouncy (420/14/0.8), glide (120/30), heavy (60/20/1.6) — as both `Transition` objects and `useSpring` option sets; tween-only exits (`fast` 0.18 s, `base` 0.25 s); `instant`; `dragPhysics` (elastic 0.12, dismiss at 500 px/s or 40% travel). `lib/motion/variants.ts`: entrances (`fadeIn`, `fadeUp` with blur lift, `fadeScale`, `blurIn`, `revealItem`), `stagger()` factory with reversed exits + `staggerWords`, surfaces (`holoCard` rest/hover/selected/tap + teal/free twins, `dock` idle/focused/cooldown-shake, `hud` ok/low-pulse/used/toppingUp-spin), messages (`bubble` hidden/streaming/done/error-shake/retrying-pulse, `tokenBatch`), sheets (`slideUpSheet` liquid, `slideRightDrawer` heavy, `dialog`, `backdrop`, `toast` bouncy), micro-interactions (`chip`, `pop`, `tick`, `lock`, `shake`), reveals (`circleReveal`, `wipeLeft/Right`, `collapseLoser`, `meetFromLeft/Right`), loops (`floatLoop`, `pulseLoop`), `reorderLayout` (layout + glide), and `withReduced()` which strips transforms/filters/clip-paths/springs, collapses keyframes, kills infinite loops and keeps opacity on 0.18 s fades; `pick()` for whole-set swaps. `components/layout/ReducedMotionProvider.tsx`: context + `MotionConfig` combining OS preference, Save-Data (read after mount, no hydration mismatch) and an app `forceReduced` prop (uiStore hookup in Task 5). `useReducedMotionSafe`, `capabilities.ts` (`canUseWebGL` = webgl2 ∧ cores ≥ 4 ∧ ¬reduced ∧ ¬saveData, memoised; `MAX_DPR` 1.5), `useTilt` (±8° on magnet springs + spotlight position), `useMagnetic` (8 px pull). Root layout wrapped in the provider; placeholder home now uses `staggerWords`/`revealItem`/`fadeUp`/`floatLoop` through `withReduced`. Verified: lint, typecheck, 37 tests (6 files), build (home 144 kB first-load JS).

- **Task 3 (2026-10-08) — design system foundation.** `styles/tokens.css`: full dark token set + `[data-theme='light']` overrides, registered `@property --angle` / `--level`, beam/conic/slider gradients, glow shadows (accent, teal, free, signal, warn, dock, sheet), radii, z-index contract (field 0 · content 10 · dock 20 · drawer 30 · sheet 40 · toast 50), easings/durations. `styles/animations.css`: 15 keyframes (hue-drift, float, breathe, spin-angle, shimmer, stripes, caret, pulse-soft, scanline, grid-drift, glitch-a/b, ripple, spin-slow). `app/globals.css`: Tailwind v4 `@theme inline` mapping (colours, display type scale `text-display-sm/display/display-lg`, `text-2xs`, tracking, glow shadows, `animate-*`), custom variants (`hocus`, `motion-ok`, `reduced`, `light`, `selected`, `streaming`), and 30+ utilities (`num`, `glass`, `glass-strong`, `text-beam`, `bg-beam`, `bg-beam-soft`, `bg-slider-track`, `conic-border(-ring/-mask)`, `shimmer-line`, `dashed-card`, `bg-field-fallback`, `bg-grid-field`, `bg-noise`, `bg-stripes-warn`, `caret-stream`, `scanline-once`, `glitch-text`, `dock-float`, `z-field…z-toast`, `hit-44`, `scrollbar-none`, `perspective-900`, `preserve-3d`); global reduced-motion kill-switch. `lib/fonts.ts`: Space Grotesk (display), Inter (UI), JetBrains Mono (numbers/code) via next/font. Root layout stacks field + grid + noise backdrops. Dev-only `/dev/tokens` gallery (404 in production). Verified: lint, typecheck, 23 tests, `next build` clean (home 142 kB first-load JS, CSS 33 kB).

- **Task 2 (2026-10-08) — env, money, API client.** `lib/env.ts` (Zod-validated `NEXT_PUBLIC_*`, literal references so Next inlines them; hex-address checks for payee/USDC.e); `lib/money.ts` (branded integer `MicroUsd`, `roundUpToTenThousandth`, `applyFee` = cost + 10% rounded up, `formatUsd` → "$0.0008"/"$0.026"/"$2.00", `ratioLabel`, `savingLine`); `lib/api/types.ts` (TEMP Zod schemas mirroring the PDF core tables; `mpp_url` deliberately omitted from the model DTO); `lib/api/keys.ts` (query-key factory + `QUOTE_TTL_MS` 5 min); `lib/api/client.ts` (`apiFetch` with `credentials:'include'`, `X-Requested-With`, schema validation, `ApiError` codes; `apiStream` for `/run`); `lib/api/endpoints.ts` (all proposed routes in one swappable file; `RUN_PATH='/run'`). Verified: lint clean, typecheck clean, 23 tests passing (money 11, client 10, home 2), guard:hosts OK.

- **Task 1 (2026-10-08) — `apps/web` scaffold.** pnpm workspace + root manifest; Next 15.5 / React 19.3 / Tailwind 4.3 / motion 12 / TanStack Query 5 / Zustand 5 / R3F 9 + drei 10 / three 0.170 / Zod 3 installed; strict tsconfig; Next config with CSP + security headers; ESLint 9 flat config (strict type-checked, a11y, import order, bans on `localStorage`/`window.ethereum`, timer ban in session code); Prettier; Vitest + RTL; Playwright (Pixel 7 + desktop); `.env.example`; `guard:hosts` script; seeded design tokens + WebGL-free drifting router field; on-brand placeholder home with Framer Motion word-stagger pitch; home smoke test. Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test` (2 passing), `pnpm guard:hosts`, `pnpm build` (home 142 kB first-load JS), `next start` returns 200 with CSP header.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | Preferences persist to IndexedDB through Zustand `persist` with `skipHydration: true`; `PreferencesProvider` calls `rehydrate()` after mount | `localStorage` is banned by rules/lint; server and first paint render defaults so there is no hydration mismatch |
| 2026-10-08 | Wallet balances are never in a store; only SDK connection status is (`walletStore`) | PDF: balances are read live from Tempo, never stored |
| 2026-10-08 | `signerStore.advance()` reserves before signing and throws at the deposit cap; `rollback()` only for runs with no result | Cumulative voucher safety (security.md §3) |
| 2026-10-08 | `uiStore.reset()` keeps theme/reduced-motion across logout | Preferences belong to the device, not the session |
| 2026-10-08 | Springs for every state change; tweens only for exits | Physics feel per design mandate; spring tails on unmount would linger |
| 2026-10-08 | HUD colour via `data-state` CSS, not CSS-variable keys inside variants (deviation from design.md's `--ring` sketch) | Framer can't reliably interpolate `var()` inside box-shadow strings; CSS handles colour, Framer handles scale/rotate |
| 2026-10-08 | Reduced motion = opacity-only fades via `withReduced()`, never "no animation"; `MotionConfig reducedMotion="user"` as a second guard | Accessibility without a dead UI; OS pref still strips transforms Framer-side |
| 2026-10-08 | `useTilt`/`useMagnetic` return bindings (ref, style, handlers) instead of components | Lets Task 6 `MagneticButton` and Task 7 `HoloCard` wrap any element |
| 2026-10-08 | Tailwind v4 CSS-first: theme, variants and utilities live in `app/globals.css` + `styles/*.css`; `tailwind.config.ts` only scopes content | v4 convention; `@theme inline` keeps `var()` references so `[data-theme='light']` swaps every utility |
| 2026-10-08 | Elevation = glow + hairline shadows only; no drop shadows | design.md material language; reads well on OLED mobile |
| 2026-10-08 | Dark is native (`<html data-theme="dark">`); light is an override block, not a separate stylesheet | Hackathon immersion; light remains available for demos/judges |
| 2026-10-08 | Global `prefers-reduced-motion` kill-switch in `@layer base` plus `motion-ok`/`reduced` variants | Accessibility baseline before any Framer/WebGL work (Task 4/7) |
| 2026-10-08 | Frontend state: TanStack Query (server) + Zustand (client) | PDF does not prescribe; small, fast, streaming-friendly |
| 2026-10-08 | Animation stack: Framer Motion + three.js/R3F/drei, capability- and reduced-motion-gated | Hackathon showpiece per `design.md`; Nigeria mobile users need fallbacks |
| 2026-10-08 | REST endpoints beyond `/run` are **proposed**, isolated in `lib/api/endpoints.ts` | PDF defers to a Backend Architecture doc we don't have |
| 2026-10-08 | Browser session/voucher client behind `SessionClient` interface with a mock impl | PDF names mppx server-side and Tempo Accounts SDK for auth; browser voucher package unnamed |
| 2026-10-08 | Streaming via `fetch` + ReadableStream, not `EventSource` | `/run` is POST with a body and cookie credentials |
| 2026-10-08 | Dark-first theme; light theme secondary | Immersive Web3 aesthetic; mobile OLED |
| 2026-10-08 | Repo initialised locally on `main` with `origin` set; docs committed one per commit; PDF not committed (now ignored via `*.pdf`) | User's atomic-commit rule; PDF is a source document, not deliverable |
| 2026-10-08 | pnpm 9.15.0 activated via corepack; `packageManager` pinned in root `package.json` | PDF mandates a pnpm monorepo; pnpm was not installed on the machine |
| 2026-10-08 | Tailwind v4 with `@theme inline` tokens mapped from CSS variables | Lets the light theme swap by redefining variables only |
| 2026-10-08 | Added `msw` (planned, Task 9) and `@eslint/eslintrc` (for Next's legacy preset) beyond the Technical_Requirements list | Needed for offline mocks and ESLint 9 flat config |

## Open questions / gaps (need the user or API team)

1. Backend Architecture doc — confirm the REST contract in `Technical_Requirements.md` §5.2 and SSE events §5.3.
2. Name of the browser package for opening session channels and signing cumulative vouchers (`authorizedSigner`, TIP-1034).
3. Shared types package name/path in the monorepo.
4. Testnet API URL; does the mock adapter expose identical endpoints?
5. Upload size/type limits (PDF: "checked for size and type", values unspecified).
6. Does a session deposit count against the on-chain spend limit? (PDF: test on testnet.)
7. Does the Tempo SDK render dialogs in iframes (affects CSP `frame-src`)?
8. Which cap the Settings UI should label: $5/day per-user cap vs weekly limit ($10/week example) — both in PDF.

## Assumptions currently in code

- `composerStore.MAX_UPLOAD_BYTES` = 10 MB and the MIME allowlist (png, jpeg, webp, text/plain, pdf) are placeholders pending Backend_Gaps_Report §7.
- `allocationStore` derives remaining = `deposit − highest_voucher` (PDF fields); `counted`/`settled` are not used client-side yet.
- IndexedDB persistence is untested in Vitest (jsdom has no IndexedDB; the adapter no-ops). Manual browser check needed once Settings exposes the toggles (Task 16).

- `ReducedMotionProvider` ignores Save-Data on the server and first paint (reads it in an effect) to avoid hydration mismatch; a one-frame full-motion flash is possible on Save-Data devices.

- `lib/api/client.ts` status→code map (Gaps §2.5 unconfirmed): 401 unauthorized · 402 allocation_exceeded · 404 not_found · 409 quote_expired · 400/422 validation · 429 rate_limited (+`Retry-After`) · 5xx server. A `code` field in the API error body overrides the mapping.
- `lib/api/endpoints.ts`: every route except `/run` is proposed (Gaps §1). `/run` path is `/run` not `/api/run` until confirmed.
- `lib/api/types.ts`: voucher payload assumed `{channel_id, cumulative_amount, signature}` (Gaps §3.2); `sessions.current` may return `null`; `free.usage.limit` defaults to 30; money fields are integer micro-USD numbers (Gaps §4.3).
- `lib/money.ts`: `ratioLabel` floors the ratio ($0.026/$0.0008 → 1/32 vs the PDF's live 1/34); the API's `reason` string is displayed verbatim when present.
- `vitest.config.ts` injects a valid public env so `lib/env.ts` doesn't throw at import in tests.

- `next.config.ts`: Tempo SDK origins for CSP come from `NEXT_PUBLIC_TEMPO_ORIGINS` (empty until Backend_Gaps_Report §8 is answered); dev CSP allows `unsafe-eval` for HMR.
- `tailwind.config.ts` only scopes content; theme mapping lives in CSS `@theme inline` (Tailwind v4 convention).
- `eslint.config.mjs`: `next/core-web-vitals` already registers jsx-a11y/import/react-hooks plugins, so only their rule sets are spread (re-registering throws in ESLint 9).
- `vitest.config.ts`: `passWithNoTests: true` so packages without tests don't fail `check`.

## Session log

- **2026-10-08 (session 6)** — Executed **Task 5** (six stores, IndexedDB helper, PreferencesProvider, 22 new tests). No new packages. Next: "execute task 6" (UI primitives).

- **2026-10-08 (session 5)** — Executed **Task 4** (springs, variants, reduced-motion provider/hook, WebGL gate, tilt/magnetic hooks, 14 new tests). jsdom canvas stubbed in test setup. No new packages. Next: "execute task 5" (Zustand stores; wire `uiStore.forceReducedMotion` into the provider).

- **2026-10-08 (session 4)** — Executed **Task 3** (tokens, keyframes, Tailwind theme + utility layer, fonts, layout backdrops, dev token gallery). Pinned `outputFileTracingRoot` to the monorepo. No new packages. Next: "execute task 4" (motion library + reduced-motion provider).

- **2026-10-08 (session 3)** — Executed **Task 2** (env, money helpers, API types/keys/client/endpoints + 21 new tests). No new packages added. Next: "execute task 3" (design tokens, fonts, Tailwind theme, global styles).

- **2026-10-08 (session 2)** — Wrote `Backend_Gaps_Report.md` (11 sections, prioritised questions); pushed `main` to origin; executed **Task 1** (see Completed features). Next: "execute task 2" (env validation, money helpers, API client).

- **2026-10-08** — Read the PDF (17 pages incl. system diagram p.2 and build plan p.16). Generated and committed: PRD.md, Technical_Requirements.md, User_Journey.md, UI_UX_Brief.md, Implementation_Plan.md, security.md, architecture.md, rules.md, agent.md, design.md, memory.md, Tasks.md.
