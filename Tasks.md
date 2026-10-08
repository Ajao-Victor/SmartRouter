# Tasks.md — SmartRouter frontend build, task by task

> Execution contract: a future prompt will say **"execute task N"**. Each task below is self-contained: files to create, state to manage, Framer Motion animations, API touchpoints, and acceptance criteria. Follow `agent.md` (commit after every file; update this file's status and `memory.md` after each task). Product facts are from `SmartRouter — Build Architecture 2.pdf`; proposed endpoints are marked **(proposed)**.
>
> Status legend: `todo` · `doing` · `done (commits: …)` · `cut`
>
> Paths are relative to `apps/web/` unless stated. If the monorepo is not yet merged, create `apps/web/` in this repo with the same structure.

---

## Phase 1 — Setup

### Task 1 — Scaffold `apps/web` with the toolchain  `done` (2026-10-08; commits: 52669c6 228b9b6 fae8670 4f4f4df 4fe6d83 7208605 48ec56d f7d2f58 6c54786 53597ee c5568d8 9a06668 3184654 f53484e 9854ad8 84aed74 5973fcc 4bad8f7 94b26b6 da6bc9d)
**Goal:** a Next.js App Router app that boots inside the pnpm workspace with the full dependency set.
**Files to create**
- `pnpm-workspace.yaml` (root, if absent): `packages: ['apps/*', 'packages/*']`
- `apps/web/package.json` — name `@smartrouter/web`; scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:e2e` (`playwright test`), `check` (`pnpm lint && pnpm typecheck && pnpm test`), `guard:hosts` (`! grep -rE "mpp\.tempo\.xyz|paywithlocus\.com|stablestudio\.dev" app components lib stores hooks`)
- Dependencies: `next@15`, `react@19`, `react-dom@19`, `typescript`, `tailwindcss@4`, `@tailwindcss/postcss`, `motion`, `@tanstack/react-query`, `zustand`, `three`, `@react-three/fiber`, `@react-three/drei`, `lucide-react`, `zod`, `clsx`, `class-variance-authority`, `@sentry/nextjs`, `react-markdown`, `rehype-sanitize`, `remark-gfm`; dev: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test`, `eslint`, `eslint-config-next`, `typescript-eslint`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`, `eslint-plugin-react-hooks`, `prettier`, `@types/three`
- `apps/web/tsconfig.json` — strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, paths `@/*` → `./*`
- `apps/web/next.config.ts` — `reactStrictMode`, `images.remotePatterns` placeholder from env, security headers function (CSP from `security.md` §4, `frame-ancestors 'none'`)
- `apps/web/postcss.config.mjs`, `apps/web/tailwind.config.ts` (empty theme extension for now)
- `apps/web/eslint.config.js` — per `rules.md` §3 including `no-restricted-imports` (`localStorage`, `window.ethereum`) and `no-restricted-syntax` for `setInterval` in `lib/tempo/session`
- `apps/web/.prettierrc` — semi true, singleQuote true, trailingComma all, printWidth 100
- `apps/web/vitest.config.ts` — jsdom, `tests/setup.ts` with jest-dom
- `apps/web/playwright.config.ts` — baseURL `http://localhost:3000`, mobile (Pixel 7) + desktop projects
- `apps/web/.env.example` — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TEMPO_NETWORK`, `NEXT_PUBLIC_SMARTROUTER_PAYEE`, `NEXT_PUBLIC_USDCE_ADDRESS`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_FEE_BPS=1000`, `NEXT_PUBLIC_FLAG_COMPARE=1`, `NEXT_PUBLIC_FLAG_MUSIC=1`, `NEXT_PUBLIC_OBJECT_STORAGE_HOST`
- `apps/web/.gitignore` — `.next`, `node_modules`, `.env*.local`, `coverage`, `playwright-report`
- `apps/web/app/layout.tsx` (minimal), `apps/web/app/page.tsx` ("SmartRouter" placeholder)
**State:** none.
**Animations:** none.
**Acceptance:** `pnpm install` succeeds; `pnpm dev` serves the placeholder; `pnpm check` and `pnpm guard:hosts` pass. One commit per file.

### Task 2 — Env validation, money helpers, API client  `done` (2026-10-08; commits: 38cfa94 22cef1b 2fd7e0b abb864b c420119 6d347e9 20d30dd 0e63837 b6edce6 1c2bd55)
**Files**
- `lib/env.ts` — Zod schema for all `NEXT_PUBLIC_*`; export `env`; throw at import if invalid. `network: 'testnet'|'mainnet'`; flags as booleans.
- `lib/money.ts` — `type MicroUsd`; `micro(n: number): MicroUsd`; `formatUsd(m, {min?:2, max?:4})` → `$0.0008`; `roundUpToTenThousandth(m)` (PDF: prices rounded **up** to $0.0001 = 100 micro-USD); `pct(a,b)`; `ratioLabel(cheap, best)` → `"1/34"` (floor of best/cheap); `savingLine(qualityPct, ratio)` → `"80% of the best quality at 1/34 of the price"`.
- `lib/money.test.ts` — rounding up (e.g. 801 → 900 micro), formatting, ratio label for $0.0008 vs $0.026 → `1/32` (document: PDF quotes 1/34 from live data; our helper floors the ratio; the API's `reason` string is authoritative — UI must display the API string when present).
- `lib/api/client.ts` — `apiFetch<T>(path, init)`: base `env.apiUrl`, `credentials:'include'`, header `X-Requested-With: smartrouter`, JSON, throws `ApiError {status, code, message, retryAfter?}`; maps 401/402/429/5xx codes.
- `lib/api/keys.ts` — query keys from `Technical_Requirements.md` §3.1.
- `lib/api/types.ts` — `export * from '@smartrouter/shared'` if available, else local **temporary** types mirroring the PDF tables (`User`, `Chat`, `Message`, `Quote`, `Recommendation`, `Model`, `UserSession`, `RequestReceipt`, `FreeUsage`) with a header comment `// TEMP until shared package is wired — see memory.md`.
- `lib/api/endpoints.ts` — typed functions for every endpoint in `Technical_Requirements.md` §5.2 **(proposed)**; `/run` returns `Response` (stream).
**State:** none.
**Animations:** none.
**Acceptance:** unit tests pass; `apiFetch` sends credentials and header (test with a mocked `fetch`).

### Task 3 — Design tokens, fonts, Tailwind theme, global styles  `done` (2026-10-08; commits: 81a1d1b 862ad76 dc1d2bf 46b9a79 915efaf 305bb88 a6c9c67 23019f4 7dcd579)
**Files**
- `styles/tokens.css` — every token from `UI_UX_Brief.md` §2 on `:root` (dark) and `[data-theme="light"]`; `@property --angle` for conic borders.
- `styles/animations.css` — keyframes: `shimmer`, `stripes` (testnet banner), `caret`, `hueDrift` (WebGL fallback), `spinSlow`.
- `app/globals.css` — `@import "tailwindcss"`, tokens, animations, base (`body` background `--bg-0`, color `--text-0`, `font-variant-numeric: tabular-nums` on `.num`).
- `tailwind.config.ts` — map colours to tokens (`bg-0/1/2`, `text-0/1/2`, `accent`, `accent-2`, `signal`, `warn`, `free`, `quality`, `price`, `speed`, `line`, `glass`), radii (`sm/md/lg/pill`), fonts (`display`, `sans`, `mono`), spacing scale.
- `lib/fonts.ts` — `next/font/google`: Space Grotesk, Inter, JetBrains Mono → CSS variables.
- `app/layout.tsx` — apply font variables, `<html data-theme="dark">`, metadata (title "SmartRouter", description from the pitch).
**State:** none.
**Animations:** none (keyframes only).
**Acceptance:** `pnpm dev` shows dark page with fonts loaded; no FOUT; tokens visible in devtools.

### Task 4 — Motion library and reduced-motion provider  `done` (2026-10-08; commits: 3d60be7 aef9885 3760ab4 ad338ac 3d5b058 2194854 0e7a8bb fc241ad 4a6140c 1bbd197 eac60b1 ee8662a 6e3e237 a691995 e749edc 762a811 3e2ac45)
**Files**
- `lib/motion/springs.ts` — `snappy`, `soft`, `liquid`, `magnet` (values in `design.md` §3).
- `lib/motion/variants.ts` — `fadeUp`, `stagger`, `holoCard`, `dock`, `hud`, `bubble`, `slideUpSheet`, `reorder`, plus `reducedFallback` (`hidden/visible/exit` opacity only).
- `lib/motion/useReducedMotionSafe.ts` — combines `useReducedMotion()` from `motion/react` with `navigator.connection?.saveData` and a `uiStore.forceReducedMotion` toggle.
- `lib/motion/capabilities.ts` — `canUseWebGL()`: webgl2 context + `hardwareConcurrency >= 4` + not reduced motion; memoised.
- `components/layout/ReducedMotionProvider.tsx` — `MotionConfig reducedMotion="user"` wrapper + context exposing `reduced` boolean.
- `lib/motion/variants.test.ts` — snapshot of variant keys.
**State:** `uiStore.forceReducedMotion` (added in Task 5; stub here if needed).
**Animations:** definitions only.
**Acceptance:** importing variants is side-effect free; test passes.

### Task 5 — Zustand stores  `done` (2026-10-08; commits: 5eb06f2 e92620b b3f0b89 c21237f 1585bcd c99fdf4 39879e6 f98aa96 96451e0 c0e9b80 162104d 7283f95 fce803a 7ddc388 dfe7c36 973771d 03528dd)
**Files**
- `stores/uiStore.ts` — `activeDialog: null|'modelPicker'|'waitlist'|'spendPermission'`, `walletSheetOpen`, `compareMode`, `theme`, `forceReducedMotion`, `sdkDialogOpen` (pauses WebGL); actions `openDialog`, `closeDialog`, `toggleWallet`, `setSdkDialogOpen`, `reset`.
- `stores/composerStore.ts` — `draft`, `attachments: File[]`, `category`, `sliderOverride`, `selectedModelId`, `compareModelIds: [string?, string?]`; actions `setDraft`, `addAttachment` (allowlist + size check; size constant `MAX_UPLOAD_BYTES` TBD → default 10 MB with a `// GAP` comment), `removeAttachment`, `selectModel`, `reset`.
- `stores/allocationStore.ts` — `depositMicro`, `remainingMicro`, `highestVoucherMicro`, `channelId`, `status: 'none'|'open'|'used'|'toppingUp'|'closed'`; selectors `remainingPct`, `isLow` (< 25%), `isUsed` (0); actions `hydrateFromSession(session)`, `applyVoucher(priceMicro)`, `restoreVoucher(priceMicro)` (no result delivered → not counted), `beginTopUp`, `endTopUp`, `reset`.
- `stores/streamStore.ts` — `byMessageId: Record<string, {tokens: string[], status, modelId, heartbeatAt, retry?: {from,to,reason}, file?, jobId?, error?}>`; actions `start`, `appendTokens` (batched), `heartbeat`, `retry`, `file`, `job`, `done`, `fail`, `clear`.
- `stores/signerStore.ts` — `publicKey`, `channelId`, `cumulativeMicro`; actions `setSigner`, `advance(priceMicro)` (throws if > deposit), `reset`. **No private key.**
- `stores/__tests__/allocationStore.test.ts`, `stores/__tests__/signerStore.test.ts` — voucher math, guard against exceeding deposit, restore path.
**Animations:** none.
**Acceptance:** tests pass; `reset()` on all stores works from a `resetAllStores()` helper in `stores/index.ts`.

### Task 6 — UI primitives  `done` (2026-10-08; commits: 64161e7 64832e2 751531b f70e739 deb227d 8a96240 cf7cfe0 210841d 38ae219 986bde0 0883397 3ec0338 d143731 22687a6 4344ab1 9942d95 595b381 a5c5e59 b0bfcc6 47d10d2 915717c ae63f19 b61f2ed 35fb61a 186c28e 9d45c85 ace5686 f2dc968 49bb331)
**Files** (each ≤ 150 lines; cva variants; forwardRef; a11y)
- `components/ui/Button.tsx` — variants `primary` (router beam gradient), `secondary` (glass), `ghost`, `danger`, `free` (green); sizes `sm|md|lg`; `loading` prop; `asChild` optional. Framer: `whileTap={{scale:0.97}}` via `motion.button`.
- `components/ui/MagneticButton.tsx` — wraps Button; pointer-tracked `x/y` `useSpring(springs.magnet)`, max offset 8px, resets on leave; disabled under reduced motion.
- `components/ui/PriceTag.tsx` — props `micro`, `size`, `emphasis`; uses `NumberTicker` (Task 7) inside; mono, `--price` colour.
- `components/ui/Chip.tsx` — pill; `selected`, `tone: accent|free|quality|neutral`.
- `components/ui/Sheet.tsx` — bottom sheet (mobile) / side panel (`lg`); `AnimatePresence`, `slideUpSheet`; `drag="y"` with velocity dismiss (>500 px/s or >40% travel); focus trap; `Esc` closes; portal `z-40`.
- `components/ui/Dialog.tsx` — centred glass dialog; focus trap; `fadeUp`; `z-40`.
- `components/ui/Drawer.tsx` — right drawer (desktop) / sheet (mobile); `z-30`.
- `components/ui/Toast.tsx` + `stores/toastStore.ts` — queue; `AnimatePresence` stack; top-centre mobile / bottom-right desktop; `z-50`.
- `components/ui/Skeleton.tsx` — shimmer.
- `components/ui/Tooltip.tsx` — minimal.
- `components/ui/Attribution.tsx` — exact text **"Quality data: LMArena, Artificial Analysis"**; fades in with `fadeUp`.
- `components/ui/__tests__/Sheet.test.tsx` — opens, traps focus, closes on Esc.
**Acceptance:** Storybook not required; a `app/dev/primitives/page.tsx` (dev-only, gated by `NODE_ENV`) renders all primitives for visual check.

### Task 7 — FX components (the futuristic layer)  `done` (2026-10-08; commits: 24d479c a88d01e 39c9382 ddd2d9f 06996fb 2cfd079 9a7f387 37c2ad1 5a490b8 f7b92d9 e0fb230 8d249d7 616a2dc 489edf5 8a94223 3152c2e a3aa125 5e23b75 1077d88 342ea4c a7432f6 1358040)
**Files**
- `components/fx/NumberTicker.tsx` — **done in Task 6** (needed by PriceTag): `useSpring` on value; `useTransform` → formatter; `tick` lift on change; `aria-live="polite"`; instant under reduced motion.
- `components/fx/GlitchText.tsx` — 3 layered spans with `clip-path` slices + hue shift, 600 ms, runs once on mount/change of `text`; fallback plain text.
- `components/fx/HoloCard.tsx` — `motion.div` with `holoCard` variants; pointer tilt via `useMotionValue` (`rotateX/Y` ±8°, `perspective 900`); rotating conic border using `--angle`; props `tone`, `selected`, `dashed` (coming-soon).
- `components/fx/LiquidRing.tsx` — SVG ring (r=28) + liquid fill rect clipped to circle, `feTurbulence`+`feDisplacementMap` wobble animated with `animate()`; props `level 0..1`, `state: ok|low|used|toppingUp` → `hud` variants; children (text) centred.
- `components/fx/GlowTrail.tsx` — SVG overlay (portal, `z-20`, `pointer-events-none`); `drawTrail(fromEl, toEls[])` imperative API via ref; path `pathLength 0→1` 600 ms, stroke gradient teal→violet, then fades.
- `components/fx/ParticleBurst.tsx` — canvas 2D singleton hook `useParticleBurst()` → `burst({x,y,color,count≤120})`; one system at a time.
- `components/fx/FloatingDock.tsx` — glass container `motion.div` with `dock` variants, `layout`, `drag="y"` constraints `[-24, 0]`, magnetic snap back.
- `components/fx/RouterOrb.tsx` — `dynamic` R3F canvas: sphere with drei `MeshTransmissionMaterial`, inner emissive sphere; props `size`, `activity 0..1`, `pulse` trigger; CSS radial-gradient fallback when `!canUseWebGL()`.
- `components/fx/RouterField.tsx` — `dynamic` R3F full-bleed: `Points` (12k desktop / 4k mobile) with custom shader (simplex noise displacement, `uTime`, `uActivity`, `uMouse`), `LineSegments` lanes with dash offset; DPR ≤ 1.5; `frameloop` `'always'` → `'never'` when `uiStore.sdkDialogOpen` or tab hidden; fallback `.bg-fallback` with `hueDrift`.
- `components/fx/shaders/field.vert.glsl`, `field.frag.glsl` (import as strings via `?raw` or template literals).
- `components/fx/__tests__/NumberTicker.test.tsx` — renders final value; reduced motion renders instantly.
**State:** reads `uiStore.sdkDialogOpen`, `streamStore` activity (sum of streaming messages) for orb/field `activity`.
**Acceptance:** dev page `app/dev/fx/page.tsx` shows each FX; FPS ≥ 30 on a throttled mobile profile; all FX degrade without WebGL and under reduced motion.

### Task 8 — App shell: layouts, TopBar, Testnet banner, providers  `done` (2026-10-08; commits: bd78071 da24c54 4e3a4d1 e78c08c ab5a6de 091471f 8b39d5e 8775f1c 5af59c7 fb76cde 42827e8)
**Files**
- `app/providers.tsx` — `QueryClientProvider` (defaults: `retry 1`, `staleTime 30s`), `ReducedMotionProvider`, Toast host, GlowTrail host, ParticleBurst canvas.
- `app/layout.tsx` — wraps providers; mounts `RouterField` backdrop (`z-0`); `TestnetBanner` when `env.network==='testnet'`.
- `components/layout/TestnetBanner.tsx` — "Testnet — paid models run on mock", animated stripes.
- `components/layout/TopBar.tsx` — mini `RouterOrb` logo (activity from streamStore), chat title slot (`GlitchText`), right slot for `AllocationHUD` (Task 15) and wallet button; sticky, glass.
- `app/(app)/layout.tsx` — authed shell; redirects to `/` if `useMe()` 401; renders `TopBar`, `WalletSheet` slot (Task 16), children with `pb-32` for the dock.
- `hooks/useMe.ts` — `['me']` query → `/api/me` (proposed).
- `app/(app)/chat/page.tsx`, `app/(app)/settings/page.tsx`, `app/(app)/chat/[chatId]/page.tsx` — placeholders.
**Animations:** TopBar `fadeUp` on mount; orb idle pulse 4 s (`scale 1→1.03`).
**Acceptance:** navigating between routes keeps the backdrop mounted (no remount flicker); 401 redirects.

## Phase 2 — Core UI (mock data)

### Task 9 — Mock API layer for development  `done` (2026-10-08; commits: a720173 c59780e fe132ec e8eac04 ccf476c 32d0d7d 79f3598 f64c1b2 818d90f 23eef09 da9cf49 0313c70 63981dc e96e1fc 056962f)
**Files**
- `tests/mocks/fixtures.ts` — models (at least: GLM 5.3 Flash $0.0008 writing; Claude Opus 5.5 $0.026; Llama 3.3 70B $0.0007; gpt-oss-120b $0.0002; Perplexity Sonar research w/ web; FLUX dev image $0.003–$0.035; Suno music ~$0.105; Free · Llama 3.1 8B), a user (allocation 2_000_000 micro, weekly 10_000_000, slider `balanced`, auto_free_fallback true), a session (deposit 2_000_000), chats/messages, quotes with `expires_at = now+5m`, recommendations `[top1, top2, bestQuality, free]` with reason `"80% of the best quality at 1/34 of the price"`.
- `tests/mocks/handlers.ts` — MSW handlers for every proposed endpoint + `/run` streaming `text/event-stream` with `meta`, `token`×n, `heartbeat`, `done`; variants: `retry` then success; `error` with `can_rerun_free`; `job` for music; `file` for image.
- `tests/mocks/browser.ts`, `tests/mocks/server.ts`; enable in dev when `NEXT_PUBLIC_MOCK=1` (add to env schema, optional).
- Add `msw` devDependency; record in `memory.md`.
**Acceptance:** with `NEXT_PUBLIC_MOCK=1`, the app runs fully offline.

### Task 10 — Landing page  `done` (2026-10-08; commits: a89ac8d 5b69e78 3e6fd7c 44eb2bc 52799d5 ea17205 1a9192f af7bf92 a100056)
**Files**
- `components/landing/Hero.tsx` — pitch line (verbatim), word-by-word `stagger(0.04)` + `fadeUp`; `RouterOrb` size 220 floating (`y: [0,-10,0]` 6 s loop); CTA pair: **Start a task** (MagneticButton primary → `/chat`), **Sign in with passkey** (secondary → Task 18 action; before that, toast "Sign-in arrives in Task 18").
- `components/landing/SavingProof.tsx` — two HoloCards ("GLM 5.3 Flash · $0.0008" / "Claude Opus 5.5 · $0.026", "Writing task · live prices Oct 7") with `NumberTicker` on viewport entry (`whileInView`), `GlowTrail` from cheap card to the saving sentence; line: "80% of the best quality at 1/34 of the price"; `Attribution` beneath.
- `components/landing/TaskChips.tsx` — chips: chat, writing, coding, research, translation, image, music; magnetic hover; click → `ParticleBurst` + `router.push('/chat?category=…')`.
- `components/landing/ProofStrip.tsx` — "10 providers · ~40 models · paid per use on Tempo via MPP"; subtle marquee of provider names with "available via MPP".
- `components/landing/ComingSoonTeasers.tsx` — dashed HoloCards "Naira via Paystack — coming soon" and "MPP Credits — coming soon (T12)"; click → waitlist dialog (Task 17; stub opens `uiStore.openDialog('waitlist')`).
- `app/page.tsx` — composes the above; footer with attribution and "Models available via MPP".
**Animations:** as listed; whole page `stagger(0.08)`.
**Acceptance:** Lighthouse mobile perf ≥ 80 with WebGL lazy; reduced-motion renders statically.

### Task 11 — Chat list and New-chat screen  `done` (2026-10-08; commits: d55c2d2 df82c00 81949a8 0c56312 59ccfad f463e25)
**Files**
- `hooks/useChats.ts` — `['chats']`, `createChat` mutation (proposed).
- `components/chat/ChatList.tsx` — HoloCard rows: title (GlitchText on first appearance), task_type chip, `spent` PriceTag, `message_count`; `stagger`.
- `components/chat/NewChat.tsx` — category chips (chat, writing, coding, research, translation, image, music) + "or describe the task" textarea (reuses Composer in `mode="new"`); submitting a description creates a chat with `first_prompt` and navigates to `/chat/[id]` where the first quote renders immediately (PDF: description classified and quoted as the first prompt).
- `app/(app)/chat/page.tsx` — `NewChat` + `ChatList`; reads `?category=` from landing (validate against the 7 categories).
**State:** `composerStore.category`.
**Animations:** chips `holoCard` hover; selected chip glows; list `stagger`.
**Acceptance:** creating a chat from a category and from a description both land on the chat page.

### Task 12 — Composer (FloatingDock) and ModelPill  `done` (2026-10-08; commits: 22b253d 4192b6d f487955 322463d c90fb56 804dc66 3475952 21adecd)
**Files**
- `components/chat/Composer.tsx` — `FloatingDock`; textarea auto-grow (max 6 rows); `Cmd/Ctrl+Enter` submits; attach button (allowlist from `security.md` §6; shows chips with remove); `ModelPill`; `CompareToggle` (flag); `RunButton`. Modes: `new` (no model yet → "Get quote") and `chat` (`Run · $0.0008` with `QuoteRing`).
- `components/chat/ModelPill.tsx` — current model label + "via MPP" or "Free · Llama 3.1 8B" (green); tap → `uiStore.openDialog('modelPicker')`.
- `components/chat/ModelPicker.tsx` — `Sheet` listing the 4 recommended (if a quote exists) then full catalog grouped by provider (from `useModels`); HoloCards; search; selecting calls `onSelect(modelId)`.
- `components/chat/RunButton.tsx` — `MagneticButton` primary; inner `PriceTag`; `QuoteRing` around it; on click fires `ParticleBurst` at pointer and `GlowTrail` (targets provided by parent).
- `components/recommend/QuoteRing.tsx` — SVG ring countdown from `expires_at`; `--warn` at ≤ 60 s; at 0 → emits `onExpired` and shows "Re-quote".
- `hooks/useModels.ts` — `['models']` (proposed).
**State:** `composerStore` (draft, attachments, selectedModelId); `uiStore.activeDialog`.
**Animations:** `dock.idle/focused/cooldown`; pill colour crossfade on model change (`layoutId="model-pill"`); picker `slideUpSheet`.
**Acceptance:** Composer works on 360px wide; attachments rejected outside allowlist with a toast.

### Task 13 — Recommendation panel, ModelCard, Slider  `done` (2026-10-08; commits: 741e2cd 97d3a93 98541ab 648ac09 5b8b9da c1680d0 69bf3e4 4a736bc 8141033 8d1ea3f 0a10501 d72233f c993d35)
**Files**
- `hooks/useQuote.ts` — mutation `POST /api/chats/:id/quote` (proposed) with `{prompt, attachments?, model_id?, slider?}`; caches under `['quote', chatId, promptHash, modelId, slider]` with `gcTime 5m`; debounce slider changes 300 ms.
- `components/recommend/Slider.tsx` — three detents Cheapest / Balanced / Best quality; gradient track; glowing thumb (`useSpring`); keyboard arrows; shows weights tooltip `(0.2,0.7,0.1)` / `(0.45,0.4,0.15)` / `(0.8,0.1,0.1)`.
- `components/recommend/QualityPriceSpeedBars.tsx` — three bars (`--quality`, `--price`, `--speed`) animating width with `springs.soft`.
- `components/recommend/ModelCard.tsx` — `HoloCard`; label; provider "via MPP" (or "Free · Llama 3.1 8B"); `PriceTag`; speed label chip; reason line typed in (12 ms/char, instant under reduced motion); badges `Best quality`, `Top pick`, `Free`, `Searches the web` (needs_web/research bonus); `selected` state; "Pick" (and "Compare" checkbox when compareMode).
- `components/recommend/SuggestionChip.tsx` — from API `suggestion {model_id, reason}`; "This looks like {task} — try {model} ({reason})"; Apply / Dismiss.
- `components/recommend/ClassificationTags.tsx` — task type · short/long · language · needs-web chips.
- `components/recommend/RecommendationPanel.tsx` — `AnimatePresence`; `stagger`; renders ClassificationTags, Slider, 4 ModelCards in a `motion` list with `layout` (re-rank), `Attribution`, SuggestionChip; emits `onPick(modelId)`, `onAuto()`, `onCompare([a,b])`.
- `components/recommend/__tests__/RecommendationPanel.test.tsx` — renders 4 cards; free card labelled exactly; slider change triggers re-quote; attribution present.
**State:** `composerStore.sliderOverride`, `selectedModelId`, `compareModelIds`.
**Animations:** card `holoCard` rest/hover/selected; `layout` reorder on slider; new #1 border flash (`boxShadow` keyframes 400 ms); bars grow; reason types.
**Acceptance:** tests pass; horizontal scroll-snap on `sm`; 2×2 on `md`; row on `lg`.

### Task 14 — Thread, MessageBubble, StreamText, Media/Job cards  `todo`
**Files**
- `hooks/useChat.ts` — `['chat', id]` query; helpers to append optimistic user/assistant messages.
- `components/chat/Thread.tsx` — virtualised-lite list (simple windowing by index for > 60 messages); auto-scroll to bottom while streaming unless the user scrolled up (show "Jump to latest" pill).
- `components/chat/MessageBubble.tsx` — `bubble` variants keyed by status; user/assistant styles; `ModelTag` (model label colour, "via MPP"/free); children by kind: `StreamText` | `MediaCard` | `JobCard`; footer: price, latency, `ThumbsFeedback`, `ReceiptLink`; `RetryNotice` when `retry` present ("Retrying on {model} — no extra charge"); error state with "Rerun on free model" (green MagneticButton).
- `components/chat/StreamText.tsx` — reads `streamStore` tokens; rAF-batched appends; each batch `opacity 0→1, y 2→0` 60 ms; caret while streaming; `lib/markdown.ts` renders sanitised markdown once `done` (plain text while streaming).
- `lib/markdown.ts` — react-markdown + remark-gfm + rehype-sanitize (default schema minus raw HTML); links `rel="noopener noreferrer" target="_blank"`; code blocks mono; scanline shimmer class on completion.
- `components/chat/MediaCard.tsx` — image via `next/image` with remote pattern; reveal `clipPath circle(0%)→circle(150%)`; download; audio with canvas waveform.
- `components/chat/JobCard.tsx` — mini RouterOrb spinning in a capsule, "Generating… (worker)"; `layoutId={jobId}` morphs into MediaCard on done.
- `components/chat/ThumbsFeedback.tsx` — up/down; `springs.snappy` scale; up emits 6 teal particles; POST `/api/feedback` (proposed).
- `components/chat/__tests__/StreamText.test.tsx` — appends tokens in order; renders markdown on done; sanitises `<script>`.
**State:** `streamStore`.
**Animations:** listed; thread items `fadeUp`.
**Acceptance:** 2,000-token mock stream stays ≥ 50 fps on desktop profile; sanitiser test passes.

### Task 15 — Allocation HUD, TopUpBar, FreeQuotaMeter  `todo`
**Files**
- `hooks/useSession.ts` — `['session','current']` (proposed), refetch 30 s; hydrates `allocationStore`.
- `hooks/useFreeUsage.ts` — `['free','usage']` (proposed) → `{messages, limit:30}`.
- `components/allocation/AllocationHUD.tsx` — `LiquidRing` with `level=remainingPct`, state from store; centre text `formatUsd(remaining)`; tap → floating panel (`fadeUp`) with deposit/remaining/highest voucher and **Top up $2** button (amount = user's allocation setting); hidden when `status==='none'` → shows "Open allocation" instead.
- `components/allocation/TopUpBar.tsx` — headline **"Allocation used — Top up $2"** (`GlitchText` flicker) and two equal MagneticButtons sliding from opposite edges: **Top up $2** (teal) · **Continue free** (green). Props `onTopUp`, `onContinueFree`; `autoFree` mode renders a one-line notice "Allocation used — continuing free" instead.
- `components/allocation/FreeQuotaMeter.tsx` — "Free: 12/30 today"; segmented bar; disabled styling at 30 with reason.
- `components/allocation/__tests__/TopUpBar.test.tsx` — both buttons; auto-free notice variant.
**State:** `allocationStore`; `uiStore`.
**Animations:** `hud` variants; ring drains (`level` spring) on `applyVoucher`; refill + ParticleBurst on `endTopUp`.
**Acceptance:** states ok/low/used/toppingUp visually distinct on dev page; tests pass.

### Task 16 — Wallet sheet (UI only), Settings page  `todo`
**Files**
- `components/wallet/WalletSheet.tsx` — `Sheet`; sections: `BalanceList`, actions (`DepositButton`, `SwapButton` conditional), `AllocationControls`, `SpendPermissionCard`, `ComingSoonCard`×2; "Returned $x from closed allocation" notice when session `closed` with unspent.
- `components/wallet/BalanceList.tsx` — HoloCard per token (USDC.e, OUSD, pathUSD, USDT0, …) with `NumberTicker`; teal "Deposit splash" ripple when a balance increases.
- `components/wallet/DepositButton.tsx`, `SwapButton.tsx` — call `lib/tempo/deposit.ts` / `swap.ts` (Task 19; stub with toast until then). Swap only rendered when non-USDC.e balance > 0; label "Swap to USDC.e".
- `components/wallet/AllocationControls.tsx` — steppers for allocation (default $2) and spending limit (e.g. $10/week) with drum-roll digits; "Open allocation" / "Top up" buttons; copy notes auto free fallback toggle.
- `components/wallet/SpendPermissionCard.tsx` — shows token USDC.e · payee SmartRouter · scope "open + top-up sessions" · expiry; shield lock animation on approval; **Revoke** plain danger button.
- `components/wallet/ComingSoonCard.tsx` — dashed HoloCard; flips (`rotateY`) to `WaitlistForm`.
- `components/wallet/WaitlistForm.tsx` — email (Zod), country select (allowlist), interest `naira|credits`; POST `/api/waitlist` (proposed); success check-mark burst.
- `app/(app)/settings/page.tsx` — allocation size, spending limit, default slider, auto free fallback (default on), spend permission status/Revoke, wallet address + explorer link (validated), attribution/licences; sections `stagger`; PATCH `/api/me/settings` (proposed).
- `hooks/useSettings.ts` — mutation; invalidates `['me']`.
**State:** `uiStore.walletSheetOpen`; `allocationStore`.
**Animations:** `slideUpSheet` + drag physics; flips; splash; drum-roll.
**Acceptance:** sheet works with touch drag on mobile emulation; settings save with mock.

### Task 17 — Receipt drawer and Compare split (UI)  `todo`
**Files**
- `hooks/useReceipt.ts` — `['request', id]` (proposed); refetch every 20 s until `tx_hash` present (settlement every $1 or hourly), max 2 h.
- `components/receipt/ReceiptDrawer.tsx` — `Drawer`; rows (`stagger`): model, price, provider cost, latency, session id (immediately), voucher amount, provider receipt, **tx hash** via `TxHashReveal` with explorer link once present (validated hex).
- `components/receipt/TxHashReveal.tsx` — random-hex decode animation to the real hash (900 ms), copy button.
- `components/chat/CompareSplit.tsx` (flag `NEXT_PUBLIC_FLAG_COMPARE`) — two columns with their own `MessageBubble`s streaming from two message ids; `clipPath` wipe on enter; **Pick this one** under each → `onPick(side)`; loser collapses `scale 0.96→opacity 0`; winner ParticleBurst; POST `/api/compare-votes` (proposed).
**State:** `uiStore.compareMode`, `composerStore.compareModelIds`.
**Acceptance:** drawer deep-link `/receipts/[id]` renders the same component; compare flag off removes toggle and component.

## Phase 3 — Web3 and backend integration

### Task 18 — Tempo Accounts SDK sign-in + SIWE + session cookie  `todo`
**Files**
- `lib/tempo/accounts.ts` — initialise the **Tempo Accounts SDK** with the **Tempo Wallet adapter**; network from env; export `getAccount()`, `signIn()` (passkey dialog over the page), `signOut()`, `onDialogOpen/Close` → `uiStore.setSdkDialogOpen` (pauses WebGL).
- `lib/tempo/siwe.ts` — build SIWE message (domain, address, nonce from `GET /api/auth/nonce`, chain id); sign via SDK (passkey or plain wallet); `POST /api/auth/verify` (proposed) → cookie.
- `hooks/useAuth.ts` — `signIn` mutation (SDK → SIWE → invalidate `['me']`), `signOut` (POST logout, `resetAllStores()`, `queryClient.clear()`).
- Wire `Hero` "Sign in with passkey" and TopBar wallet button; `(app)/layout` redirect uses `useMe`.
**State:** `uiStore.sdkDialogOpen`.
**Animations:** orb brightens on successful sign-in; TopBar address chip `fadeUp`.
**Acceptance:** on testnet, sign-in sets the cookie and `/api/me` returns the user; cancel path shows toast "Sign-in cancelled".
**Gap handling:** if SDK method names differ from assumptions, adapt and record in `memory.md`.

### Task 19 — Balances, deposit and swap dialogs  `todo`
**Files**
- `hooks/useBalance.ts` — reads balances via the SDK (PDF: wallet balances are read from Tempo, never stored); `['wallet','balance']`, refetch 15 s while sheet open; returns per-token micro amounts and `hasNonUsdce`.
- `lib/tempo/deposit.ts` — open the SDK deposit flow (`wallet_deposit`): chain, token, amount; on close → invalidate balance.
- `lib/tempo/swap.ts` — open the SDK swap screen (`wallet_swap`) to USDC.e; on close → invalidate balance.
- Replace stubs in `DepositButton`, `SwapButton`; trigger Deposit splash when USDC.e increases.
**Acceptance:** on testnet, deposit dialog opens over the page; balance updates after close; swap button appears only when a non-USDC.e balance exists.

### Task 20 — Spend permission and session open (SessionClient)  `todo`
**Files**
- `lib/tempo/session/SessionClient.ts` — interface: `openChannel({maxDepositMicro, authorizedSigner}) → {channelId}`, `topUp({channelId, amountMicro})`, `signVoucher({channelId, cumulativeMicro}) → signature`, `status(channelId)`.
- `lib/tempo/session/voucherSigner.ts` — WebCrypto non-extractable keypair; persisted in IndexedDB (`idb-keyval`-style minimal helper in `lib/idb.ts`) keyed by channel id; `getOrCreate()`, `publicKey()`, `sign(bytes)`, `forget()`.
- `lib/tempo/spendPermission.ts` — request the scoped access key: token = `env.usdceAddress`, payee = `env.smartrouterPayee`, calls = session open + top-up, expiry (default 30 days — **assumption**, record); `revoke()`; `status()`.
- `lib/tempo/session/impl.mock.ts` — in-memory impl for testnet/dev.
- `lib/tempo/session/impl.tempo.ts` — real implementation **once the browser package is confirmed** (GAP). Until then export mock with a loud console warning on mainnet.
- `hooks/useOpenAllocation.ts` — flow: ensure spend permission (dialog, one passkey tap) → `voucherSigner.getOrCreate()` → `openChannel(maxDeposit = allocation)` → `POST /api/sessions {channel_id, authorized_signer}` (proposed) → hydrate `allocationStore`.
- `hooks/useTopUp.ts` — **only from a click handler**: `beginTopUp` → `topUp(allocation)` → refetch session → `endTopUp` (refill animation + burst). No timers.
- Wire `AllocationControls`, `AllocationHUD` panel, `TopUpBar`, `SpendPermissionCard` (status/Revoke).
- `lib/tempo/session/__tests__/voucherSigner.test.ts` — key is non-extractable; signatures verify with the public key.
**Acceptance:** first run shows exactly one spend-permission approval; HUD shows $2.00; Revoke clears status; lint rule blocks any `setInterval` in this folder.

### Task 21 — Quote → allocation check → voucher → `/run` SSE  `todo`
**Files**
- `lib/api/sse.ts` — `runStream(body, handlers)`: `fetch` POST `/run` with `credentials:'include'`; parse `text/event-stream` from `ReadableStream`; events `meta|token|heartbeat|retry|file|job|done|error` (Zod-validated); 45 s heartbeat watchdog → `error`; abort support.
- `hooks/useRun.ts` — orchestrates: (1) quote fresh? else re-quote; (2) if `is_free` skip voucher; else `allocationStore.remaining ≥ price` else emit `needsTopUp` (TopUpBar or auto-free when `me.auto_free_fallback`); (3) `signerStore.advance(price)` + `SessionClient.signVoucher(cumulative)`; (4) create optimistic messages; (5) `runStream` → `streamStore`; on `done` → `applyVoucher`, invalidate chat/session/free usage; on `error` without result → `restoreVoucher` (PDF: not counted) and offer rerun free; on `retry` → RetryNotice.
- `components/chat/ChatWorkspace.tsx` — composes Thread, RecommendationPanel (when quote exists), TopUpBar (when needed), CompareSplit, Composer; GlowTrail targets (Run → selected ModelCard → HUD).
- `app/(app)/chat/[chatId]/page.tsx` — renders ChatWorkspace; first quote auto-fires when the chat was created from a description.
- `lib/api/__tests__/sse.test.ts` — all event types; heartbeat watchdog; abort.
- `hooks/__tests__/useRun.test.tsx` — paid path signs voucher with cumulative total; free path doesn't; needsTopUp when price > remaining; auto-free path.
**Animations:** on run: ParticleBurst + GlowTrail; ring drains; bubble `streaming`; orb `activity` 1; heartbeat pulse.
**Acceptance:** mock + testnet runs stream to completion; retry notice renders; receipts link works.

### Task 22 — Model switching, suggestions, per-turn quotes, long-chat notes  `todo`
**Files**
- Extend `useQuote` to re-quote on every turn for the current model (PDF: priced on history + new prompt).
- `ModelPill`/`ModelPicker` → `PATCH /api/chats/:id {current_model_id}` (proposed) + re-quote; `layoutId` crossfade.
- `SuggestionChip` apply → select model + re-quote.
- `components/chat/ThreadNotes.tsx` — info notes: "Image/music turns send only the new prompt plus a one-line summary" when switching to image/music in a text chat; "Older turns summarised" when `chat.summary` present; title `GlitchText` when `chat.title` first arrives.
**Acceptance:** switching model mid-chat keeps one thread and new replies carry the new model tag.

### Task 23 — Async jobs, images, Compare execution, feedback  `todo`
**Files**
- `hooks/useJob.ts` — `['job', id]` poll 3 s until `done|failed` (proposed `/api/jobs/:id`); on done update message `result_ref` → MediaCard morph.
- Wire `event: file` → MediaCard; `event: job` → JobCard (music flag `NEXT_PUBLIC_FLAG_MUSIC`).
- `useRun` compare mode: two quotes, two vouchers (cumulative advanced twice), two streams; `CompareSplit` pick → `POST /api/compare-votes` + `PATCH current_model_id`.
- `ThumbsFeedback` → `POST /api/feedback`.
**Acceptance:** image result reveals; music job polls to a playable audio card; compare vote posts; flags cut cleanly.

### Task 24 — Receipts with settlement tx hash, free usage, error semantics  `todo`
**Files**
- Wire `ReceiptDrawer` to `useReceipt`; TxHashReveal when `tx_hash` arrives; explorer link base per network in `lib/explorer.ts` (validated).
- `FreeQuotaMeter` from `useFreeUsage`; disable Free card at 30 with reason.
- Error mapping in `lib/api/client.ts` → UI per `Technical_Requirements.md` §5.4: 429 → `dock.cooldown` + disabled Run for `retryAfter`; 401 → sign-in; session `closed` → "Open allocation"; quote expired → auto re-quote.
- `components/chat/__tests__/errorSemantics.test.tsx`.
**Acceptance:** each row in §5.4 has a test or a mock scenario; receipts show session id immediately and tx hash later.

### Task 25 — Sentry, CSP verification, host guard, env docs  `todo`
**Files**
- `sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts` — DSN from env; `sendDefaultPii:false`; `beforeSend` scrubs prompts/addresses.
- Verify CSP in `next.config.ts` against the real Tempo SDK origins (iframe or not → `frame-src`); record in `memory.md`.
- CI script `scripts/ci.sh`: `pnpm check && pnpm guard:hosts && pnpm build`.
- `README.md` section for `apps/web`: env, run, test, flags.
**Acceptance:** `scripts/ci.sh` green; no provider hosts in bundle; a thrown test error appears in Sentry (testnet DSN).

## Phase 4 — Polish and launch

### Task 26 — Performance and fallbacks  `todo`
- Lazy-load R3F chunks; verify budgets in `design.md` §5 with `next build` analyser; DPR cap; `frameloop="never"` on hidden tab and SDK dialogs; blur surface count ≤ 3; test on throttled mobile profile; low-end gate falls back to CSS; `saveData` honoured.
**Acceptance:** Lighthouse mobile ≥ 80 landing, ≥ 70 chat; no jank during streaming.

### Task 27 — Accessibility and copy pass  `todo`
- Focus traps, `aria-live` for streaming/done/allocation used, contrast on glass ≥ 4.5:1, 44px targets, keyboard slider, Esc everywhere.
- Copy audit against `UI_UX_Brief.md` §8 (verbatim strings); "available via MPP" and attribution present wherever recommendations appear.
**Acceptance:** axe has no serious violations on landing, chat, wallet, settings.

### Task 28 — E2E demo path and video rehearsal  `todo`
- `tests/e2e/demo.spec.ts` (mock API): deposit → allocation → task → recommendation → result → top-up → receipt.
- `docs/demo-script.md` with the 3-minute choreography from `design.md` §7 and timing.
**Acceptance:** e2e passes on mobile + desktop projects; a screen recording of the mock path exists.

### Task 29 — README, architecture diagram, PWA manifest (optional), final memory  `todo`
- Root `README.md`: product summary (pitch), architecture diagram (ASCII from `architecture.md` §1 or an SVG), how to run web, flags, attribution/licences (LMArena CC-BY-4.0 credit; Artificial Analysis).
- `public/manifest.webmanifest` + icons (PWA later per PDF — optional).
- Final `memory.md` status board; `Tasks.md` all statuses set.
**Acceptance:** public repo readable by judges; `pnpm check` green on `main`.

---

## Task dependency graph

```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
9 → 10, 11, 12, 13, 14, 15, 16, 17   (core UI on mocks; 12 before 13; 14 before 17)
8 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25
25 → 26 → 27 → 28 → 29
```

## Cut plan (PDF order)
1. Task 17/23 Compare parts → `cut` (flag off).
2. Task 23 music/JobCard polling → `cut` (flag off); images stay.
