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
| Phase 1 Setup | ✅ Tasks 1–8 done (Oct 8, 2026) |
| Phase 2 Core UI | ✅ Tasks 9–17 done (Oct 8, 2026) |
| Phase 3 Integration | 🟡 Tasks 18–21 done (Oct 8, 2026); Tasks 22–25 next |
| Phase 4 Polish | ⬜ |

## Completed features

- **Task 21 (2026-10-08) — quote → allocation check → voucher → `/run` SSE.** `lib/api/sse.ts` (`runStream`: fetch + ReadableStream POST, SSE frame parser, Zod-validated `meta/token/heartbeat/retry/file/job/done/error`, 45 s heartbeat watchdog → `timeout`, abort cancels the reader; outcomes done/error/aborted). `hooks/useRun` (PDF steps 6–11: pick the recommendation (Auto = top paid pick), quote freshness → `needs_requote`, allocation check via `selectCanAfford` → auto-free ("Allocation used — continuing free") or `needs_top_up`, `no_allocation`, `free_exhausted`; optimistic user + assistant messages; `signerStore.advance` + `SessionClient.signVoucher` cumulative voucher; stream events → `streamStore`; on done: `applyVoucher`, record content/request/model, invalidate session/chats/free usage; no result → `restoreVoucher` + signer rollback, error state with rerun-free; 429 → cooldown shake; `rerunFree`). `ChatWorkspace` (Thread + TopUpBar (Top up re-runs after success; Continue free forces free) + RecommendationPanel (slider re-quote, pick/Auto run, suggestion re-quote, card refs) + ModelPicker (PATCH current model + re-quote) + Composer (stale draft → Get quote; quote ring expiry → re-quote); GlowTrail Run → chosen card → HUD; `?first=1` auto-quotes the stored draft; page title → TopBar via `uiStore.pageTitle`). `/run` body now carries `prompt` (server records both messages — PDF step 10); mock appends the user message. Chat route validates the id. Verified: lint, typecheck, 135 tests (38 files).

- **Task 20 (2026-10-08) — spend permission + session open (`lib/tempo/session/`).** `voucherSigner` (non-extractable WebCrypto ECDSA P-256 keypair per channel, persisted in IndexedDB — never in state; `publicKeyHex` raw SPKI as `authorized_signer`; `sign`/`verify`/`adopt`/`forget`; canonical voucher bytes `${channelId}:${cumulative}` — assumption, Gaps §3.2). `SessionClient` interface (openChannel maxDeposit + authorizedSigner, topUp without close, signVoucher cumulative, status) with `MockSessionClient` (in-memory channels, real signatures, no timers) and an unwired `impl.tempo.ts` stub; `getSessionClient()` warns on mainnet. `spendPermission.ts` (scope = USDC.e token, SmartRouter payee, open+topUp calls, 30-day expiry assumption; ensure/get/revoke via the adapter). `useSpendPermission` (query + approve/revoke, `permissionStatus`). `useOpenAllocation` (permission → signer → channel → `POST /api/sessions` → stores). `useTopUp` (click-only; `beginTopUp` → client top-up → mock-only `POST /api/sessions/:id/top-up` → `endTopUp`; the real API is expected to observe the chain — Gaps §3.5). AppShell/Settings wired (HUD Open allocation / Top up with a teal burst; wallet sheet permission approve/revoke). Verified: lint, typecheck, 125 tests (36 files).

- **Task 19 (2026-10-08) — balances, deposit, swap.** `hooks/useBalance` (reads balances through the Tempo adapter — never stored; 15 s refetch while the wallet sheet is open; `hasNonUsdce`, `usdce`). `lib/tempo/deposit.ts` (`openDeposit`: SDK deposit dialog then balance refetch so the splash animates). `lib/tempo/swap.ts` (`openSwapToUsdce`: SDK swap screen then refetch). AppShell wires live balances, Deposit and the conditional Swap button into the WalletSheet. Verified: lint, typecheck, 122 tests (34 files).

- **Task 18 (2026-10-08) — Tempo sign-in + SIWE (`lib/tempo/`).** `types.ts`: `TempoAccountsAdapter` interface (init, getAccount, signIn passkey dialog, signOut, signMessage, getBalances, openDeposit, openSwap, request/get/revoke spend permission, onDialog). `mock.ts`: `MockTempoAccounts` simulating every SDK dialog with a delay while emitting open/close (persisted account + permission in IndexedDB; demo balances USDC.e $12.50 + OUSD $4.00; deposit adds $2 USDC.e; swap folds other tokens into USDC.e). `accounts.ts`: `getTempoAccounts()` returns the mock on testnet/mock (loud console warning on mainnet until the real SDK lands — Gaps §3) and pipes dialog events into `uiStore.sdkDialogOpen` (WebGL pauses, overlays never cover the SDK). `siwe.ts`: EIP-4361 message builder (placeholder chain ids 4217/4216 — Gaps §5.4) and `signInWithEthereum` (nonce → sign → verify → user). `hooks/useAuth`: signIn (walletStore initialising→connecting→signing→connected; cancel → "Sign-in cancelled"; failure → "Couldn't verify your signature. Try again."), signOut (logout + adapter signOut + `qc.clear()` + `resetAllStores()`), restore. Landing "Sign in with passkey" → passkey flow → `/chat`; Settings "Sign out"; AppShell restores the account on mount. Also fixed the Task 17 receipt test (provider cost shows four decimals). Verified: lint, typecheck, 121 tests (33 files).

- **Task 17 (2026-10-08) — receipts + compare.** `hooks/useReceipt` (polls every 20 s for up to 2 h until `tx_hash`; never for free runs). `TxHashReveal` (characters decode from random hex to the real hash in 900 ms; sr-only full hash; copy button; explorer link only for regex-valid hashes). `ReceiptView` (staggered rows: model · via MPP, price, provider cost, latency, status, session id, voucher, provider receipt, settlement = tx hash / "pending · settles every $1 or hourly" / none (free), request id). `ReceiptDrawer` (Drawer bound to `uiStore.receiptRequestId`, mounted in AppShell) + deep link `/receipts/[requestId]` (id regex-validated). `CompareSplit` (feature-flagged in Task 23: two columns wipe in from their edges, both bubbles stream, "Pick this one" per side, loser collapses, winner bursts). Verified: lint, typecheck, 118 tests (32 files).

- **Task 16 (2026-10-08) — wallet sheet + settings (`components/wallet/`).** `WalletSheet` (Sheet bound to `uiStore.walletSheetOpen`: address, "Returned $x from closed allocation" notice, `BalanceList` HoloCards with NumberTicker and a teal deposit splash when a balance grows, `DepositButton`, conditional `SwapButton` "Swap to USDC.e" with spinning icon, `AllocationControls` (drum-roll steppers: allocation $1–$50 step $1 default $2; spending limit $5–$500/wk step $5; auto free fallback `Switch`), Open allocation / Top up button by session status, `SpendPermissionCard` (token USDC.e + address, payee SmartRouter + address, scope "open and top up sessions only", expiry; shield-lock animation when granted; plain danger Revoke), two flipping `ComingSoonCard`s → `WaitlistForm` (Zod email, country allowlist NG-first, interest; success pop + burst)). Global `WaitlistDialog` (landing teasers). Settings page (allocation controls, default PresetSlider, spend permission, wallet address + validated explorer link, light theme + reduce-motion switches persisted via uiStore, licence notes). `hooks/useSettings`, `lib/explorer.ts` (placeholder bases; regex-validated tx/address links), `ui/Switch`. AppShell now mounts the HUD + WalletSheet with toast stubs until the SDK wiring (Tasks 19–20). Verified: lint, typecheck, 114 tests (30 files).

- **Task 15 (2026-10-08) — allocation HUD (`components/allocation/`).** `hooks/useSession` (30 s refetch, mirrors into `allocationStore`), `hooks/useFreeUsage`. `AllocationHUD` (44 px LiquidRing of remaining/deposit with ok/low/used/toppingUp; tap → floating panel with deposit/used/remaining and "Top up $2"; "Open allocation · $2" button when none/closed; copy: no automatic top-ups). `TopUpBar` (PDF "Allocation used — Top up $2" via GlitchText; Top up | Continue free MagneticButtons meeting from opposite edges; auto-free notice "Allocation used — continuing free"; Continue free disabled at 30/30). `FreeQuotaMeter` ("Free: n/30 today" segmented meter, signal at the cap). Verified: lint, typecheck, 111 tests (29 files).

- **Task 14 (2026-10-08) — thread + messages (`components/chat/`).** `lib/markdown.tsx` (react-markdown + GFM + rehype-sanitize; http/https/mailto only; new-tab noopener links; mono code with `scanline-once`). `hooks/useChat` (chat+messages query; optimistic cache helpers `append/update/setCurrentModel`; `optimisticMessage`). `hooks/useModelLabel`, `hooks/useFeedback` (thumbs + compare votes). `StreamText` (plain text + caret while streaming, rAF-batched flush with per-batch micro-entrance, markdown once done; resets on retry). `MessageBubble` (user bubble; assistant glass bubble driven by `streamStore` status via `bubble` variants: streaming/retrying/error/done; model tag "{label} · via MPP" or free; "Retrying on {model} — no extra charge"; error → "Rerun on free model"; footer price/latency, ThumbsFeedback, Receipt → `uiStore.openReceipt`). `ThumbsFeedback` (pop + six teal particles on up). `MediaCard` (circle-reveal image via next/image, unoptimized unless object-storage host; audio with canvas waveform; download). `JobCard` (orb capsule "Generating… (worker)", `layoutId` morph to MediaCard). `Thread` (auto-follow while streaming unless scrolled up → "Jump to latest"; 60-message window with "Show earlier"). `streamStore.done(id, result)` records price/latency/request id; `uiStore.receiptRequestId`. Verified: lint, typecheck, 104 tests (27 files).

- **Task 13 (2026-10-08) — recommendation panel (`components/recommend/`).** `hooks/useQuote` (mutation to `POST /api/chats/:id/quote`; caches by chat/prompt-hash/model/slider with 5-min GC; `isQuoteExpired`). `PresetSlider` (ui Slider with Cheapest/Balanced/Best quality detents + weights tooltip (0.2,0.7,0.1)/(0.45,0.4,0.15)/(0.8,0.1,0.1)). `QualityPriceSpeedBars` (three bars grow on the soft spring). `TypeLine` (12 ms/char typed reason). `ClassificationTags` (task · short/long · language · needs web). `SuggestionChip` (shimmering "This looks like {task} — try {model}" with Switch/Dismiss — suggest, never force). `ModelCard` (HoloCard option: label, "via MPP"/free, PriceTag, speed bolts + web globe, typed reason, bars, Top pick/Best quality/Free badges as spans, compare checkbox). `RecommendationPanel` (AnimatePresence + stagger; tags, Auto button, slider with 300 ms debounced re-quote, four cards with `reorderLayout` on the glide spring, horizontal snap row on mobile → 2×2 → row of 4, suggestion, Attribution; `cardRef` registry for GlowTrail targets). `lib/useDebouncedCallback`. Verified: lint, typecheck, 98 tests (25 files).

- **Task 12 (2026-10-08) — Composer.** `Composer` (FloatingDock that lifts on focus and shakes on `cooldownKey`; auto-growing textarea to 6 rows; ⌘/Ctrl+Enter; attachment picker with the security.md allowlist, rejection toasts, removable chips; `ModelPill`; Compare chip behind `NEXT_PUBLIC_FLAG_COMPARE`; `RunButton`). `RunButton` (MagneticButton: "Get quote" when unquoted; "Run · $price" with `QuoteRing` when quoted; green when free; teal/green burst on tap; parent owns the GlowTrail). `QuoteRing` (SVG countdown over the 5-minute TTL, amber ≤ 60 s, `onExpired` at 0, `role=timer`). `ModelPill` ("{label} · via MPP" / "Free · Llama 3.1 8B" / "Auto · top pick"; `layoutId` crossfade; opens the picker). `ModelPicker` (Sheet: recommended HoloCards for the prompt, then the catalog grouped by provider labelled "available via MPP", search). `hooks/useModels`. Verified: lint, typecheck, 95 tests (24 files).

- **Task 11 (2026-10-08) — chat list + new chat.** `hooks/useChats` (list query; `useCreateChat` mutation prepends to the cache). `ChatList` (stagger of tilting HoloCard rows: GlitchText title, task chip, `PriceTag` spend with Free label, message count; keyboard-navigable `role=link`). `NewChat` (seven PDF category chips bound to `composerStore.category`, "Or describe the task" textarea with ⌘/Ctrl+Enter, MagneticButton "Start chat" / "Get a quote"; a description creates the chat with `first_prompt`, stores the draft and routes to `/chat/:id?first=1` so the workspace auto-quotes it — PDF: classified and quoted as the first prompt). New-chat page reads `?category=` (Zod-validated) inside a Suspense boundary and lists recent chats. Fixed `apiFetch`'s schema generic (`ZodType<T, ZodTypeDef, unknown>`) so branded micro-USD survives inference. Verified: lint, typecheck, 91 tests (22 files).

- **Task 10 (2026-10-08) — landing page (`components/landing/`, `app/page.tsx`).** `Hero` (verbatim PDF pitch with word-by-word blur reveal, first two words in the beam gradient, 220 px floating RouterOrb, MagneticButton "Start a task" → `/chat`, glass "Sign in with passkey" with a loading state for Task 18). `SavingProof` (two HoloCards — GLM 5.3 Flash $0.0008 teal / Claude Opus 5.5 $0.026 — prices tick up on viewport entry, a teal GlowTrail is drawn from the cheap card to the verbatim "80% of the best quality at 1/34 of the price" line, Attribution beneath). `TaskChips` (seven PDF categories, burst + `router.push('/chat?category=…')`). `ProofStrip` ("10 providers · ~40 models · paid per use on Tempo via MPP" + looping marquee of the ten providers labelled "available via MPP"). `ComingSoonTeasers` (dashed HoloCards for Naira via Paystack and MPP Credits that open the waitlist dialog; keyboard-accessible). Page header/footer with attribution and the USDC.e-only line. Verified: lint, typecheck, 87 tests (21 files).

- **Task 9 (2026-10-08) — mock API layer (`tests/mocks/`).** MSW 2.15 added. `fixtures.ts`: demo user (NG, balanced, $2 allocation, $10/week, auto-free on), open $2 session, 14 models across all 10 PDF providers with Oct 7 prices (GLM 5.3 Flash $0.0008, Claude Opus 5.5 $0.026, Llama 3.3 70B $0.0007, gpt-oss-120b $0.0002, Sonar, FLUX, StableStudio, Suno ~$0.105, Free · Llama 3.1 8B). `state.ts`: in-memory chats/messages/quotes/sessions/requests/jobs/free usage, keyword classifier (PDF task types), price = est × context scale + 10% rounded up to $0.0001, 5-min quotes, settlement tx hash on 2nd receipt poll, jobs queued→running→done over 3 polls, seeded demo chat. `handlers.ts`: every proposed route + streaming `/run` (SSE meta/token/heartbeat/retry/file/job/done/error; 409 quote_expired, 402 allocation_exceeded / free_quota_exhausted / session_closed; prompt hooks `[retry]` `[fail]` `[slow]`; writes messages/receipts/voucher totals). Slider-weighted mock ranker returns top 2 + best quality + free with PDF-style reasons. `browser.ts`/`server.ts` entries; `MockProvider` boots the worker when `NEXT_PUBLIC_MOCK=1` and holds rendering until active; `public/mockServiceWorker.js`. Verified: lint, typecheck, 87 tests (21 files).

- **Task 8 (2026-10-08) — app shell.** `app/providers.tsx` (QueryClient: staleTime 30 s, no retry on unauthorized/validation, else 1; PreferencesProvider; RouterField; GlowTrailLayer; ParticleLayer; Toaster). Root layout = Providers + `TestnetBanner` (striped strip when `NEXT_PUBLIC_TEMPO_NETWORK=testnet`). `hooks/useMe` (`/api/me`, flags `isUnauthenticated`/`isOffline`). `TopBar` (sticky glass, 28 px RouterOrb logo with heartbeat `pulseKey`, beam wordmark, GlitchText chat title, right slot for the HUD, wallet toggle → `uiStore.toggleWallet`). `AppShell` (client gate: 401 → `router.replace('/')`, skeleton while pending, offline alert, `pb-32` for the dock). Route group `(app)` with placeholder `chat`, `chat/[chatId]`, `settings`. Verified: lint, typecheck, 82 tests (20 files).

- **Task 7 (2026-10-08) — FX layer (`components/fx/`).** `GlitchText` (base blur-in + two hue-shifted clip-path slices tearing for 600 ms, sr-only text for AT, plain text under reduced motion). `HoloCard` (glass/dashed card, `useTilt` ±8° on magnet springs, pointer-following radial spotlight via `useMotionTemplate`, rotating conic beam ring when selected, holoCard/teal/free variants). `LiquidRing` (SVG meter: liquid rect on the liquid spring, surface wobble from animated `feTurbulence` seed + `feDisplacementMap`, colour by `data-state` → `--ring`, hud variants ok/low/used/toppingUp). `GlowTrail` (`useGlowTrail()` draws a gradient beam through element centres as quadratic curves; `pathLength` 0→1 then fade; `GlowTrailLayer` fixed SVG at z-dock; ≤4 trails). `ParticleBurst` (`ParticleLayer` singleton canvas 2D at DPR ≤1.5, ≤120 particles, gravity + glow; `useParticleBurst()` + `burstAt(e)`; no-op under reduced motion). `FloatingDock` (glass dock on `dock-float`, lift on focus, drag up 24 px with snap-to-origin, cooldown shake on `shakeKey`). `RouterOrb` (R3F `MeshTransmissionMaterial` icosahedron + emissive core + teal nucleus, rotation/breathing scale by activity, one-shot pulse on `pulseKey`; CSS radial orb with pulseLoop fallback). `RouterField` (R3F points 12k desktop / 4k mobile displaced by GLSL simplex noise with `uTime/uActivity/uMouse`, additive soft-disc fragments, six dashed lanes animated by shifting `lineDistance`; always layered over the CSS field fallback + grid + noise; pauses on hidden tab / SDK dialog). `stores/fxStore` bus. Root layout mounts RouterField, GlowTrailLayer, ParticleLayer. Dev gallery `/dev/fx`. Verified: lint, typecheck, 81 tests (19 files), build (home 149 kB first-load; R3F scenes in lazy chunks; `/dev/fx` 168 kB).

- **Task 6 (2026-10-08) — UI primitives (`components/ui/`).** `Button` (cva: primary = beam gradient + accent glow + hover sheen sweep; secondary = glass; ghost; danger = deliberately plain; free = green glow; sizes sm/md/lg/icon with 44 px hit targets; hover lift on magnet spring, tap compress on snappy, spinning ring while loading). `MagneticButton` (8 px pointer pull via `useMagnetic`). `NumberTicker` (fx; snappy spring between values, `tick` lift up/down, aria-live) + `PriceTag` (mono tabular, tone price/free/neutral/signal, "Free" label at zero). `Chip` (glass pill, `chip` variants, tone glows accent/free/quality/teal/neutral, `data-selected` + `aria-pressed`). `Slider` (mechanical detents: thumb follows pointer on a motion value, snaps to nearest detent on a snappy spring, bouncy "click" on each snap, beam track teal→violet→blue, detent ticks, keyboard ←/→/Home/End, `role=slider` + valuetext). `Input`/`Textarea` (glass field, focus glow, signal glow + `shake` on error, aria-describedby). `Overlay` engine (Portal, dimmed blurred backdrop, `useFocusTrap`, Escape, body scroll lock, velocity/travel drag dismiss from `dragPhysics`, never mounts while `uiStore.sdkDialogOpen`). `Sheet` (mobile bottom sheet on liquid spring with grab handle / desktop right panel on heavy spring; z-sheet 40), `Dialog` (centred blur-in on snappy spring, accent glow; z-sheet), `Drawer` (z-drawer 30 so wallet can open above receipts). `toastStore` + `Toaster` (bouncy entrance, tone glows, top-centre mobile / bottom-right desktop, max 4, `toast.success/error/...` helpers). `Skeleton` (shimmer sweep), `Tooltip` (fadeScale), `Attribution` (verbatim licence line). Support: `lib/a11y/useFocusTrap`, `lib/useMediaQuery` (`useSyncExternalStore`, server = mobile), `components/ui/Portal`. Dev gallery `/dev/primitives`. Verified: lint, typecheck, 72 tests (15 files), build (gallery 158 kB first-load).

- **Task 5 (2026-10-08) — state management.** Six Zustand slices in `stores/`: `uiStore` (dialog stack, wallet sheet, compare mode, `theme`, `forceReducedMotion`, `sdkDialogOpen`, `hydrated`; persists only theme + reduced-motion to IndexedDB via `persist` + `skipHydration`), `composerStore` (draft, attachments with MIME allowlist / 10 MB placeholder / max 4, category, slider override, selected model, compare slots), `allocationStore` (mirrors `user_sessions`: deposit, remaining = deposit − highest_voucher, status none/open/used/toppingUp/closed, `applyVoucher`/`restoreVoucher`/top-up cycle; selectors `remainingPct`, `isLow` < 25%, `isUsed`, `canAfford`), `signerStore` (public key, channel, cumulative total, deposit cap; `advance()` throws `VoucherCapError` above the deposit; `rollback()`; no key material), `streamStore` (per-message token buffers, status idle/streaming/done/error/retrying, heartbeat, retry, file, job; `selectActivity` 0..1 for the orb/field), `walletStore` (SDK status idle→initialising→connecting→signing→connected/error, address, `sessionReady`; balances deliberately excluded). `stores/index.ts` exports `resetAllStores()` for logout. `lib/idb.ts`: fail-safe IndexedDB KV + Zustand async storage adapter. `components/layout/PreferencesProvider.tsx`: rehydrates `uiStore` after mount, flips `hydrated`, applies `data-theme` to `<html>`, feeds `forceReducedMotion` into `ReducedMotionProvider`. Verified: lint, typecheck, 59 tests (11 files), build.

- **Task 4 (2026-10-08) — motion architecture.** `lib/motion/springs.ts`: seven springs — snappy (500/32/0.6), soft (170/26), liquid (90/18/1.2), magnet (300/20), bouncy (420/14/0.8), glide (120/30), heavy (60/20/1.6) — as both `Transition` objects and `useSpring` option sets; tween-only exits (`fast` 0.18 s, `base` 0.25 s); `instant`; `dragPhysics` (elastic 0.12, dismiss at 500 px/s or 40% travel). `lib/motion/variants.ts`: entrances (`fadeIn`, `fadeUp` with blur lift, `fadeScale`, `blurIn`, `revealItem`), `stagger()` factory with reversed exits + `staggerWords`, surfaces (`holoCard` rest/hover/selected/tap + teal/free twins, `dock` idle/focused/cooldown-shake, `hud` ok/low-pulse/used/toppingUp-spin), messages (`bubble` hidden/streaming/done/error-shake/retrying-pulse, `tokenBatch`), sheets (`slideUpSheet` liquid, `slideRightDrawer` heavy, `dialog`, `backdrop`, `toast` bouncy), micro-interactions (`chip`, `pop`, `tick`, `lock`, `shake`), reveals (`circleReveal`, `wipeLeft/Right`, `collapseLoser`, `meetFromLeft/Right`), loops (`floatLoop`, `pulseLoop`), `reorderLayout` (layout + glide), and `withReduced()` which strips transforms/filters/clip-paths/springs, collapses keyframes, kills infinite loops and keeps opacity on 0.18 s fades; `pick()` for whole-set swaps. `components/layout/ReducedMotionProvider.tsx`: context + `MotionConfig` combining OS preference, Save-Data (read after mount, no hydration mismatch) and an app `forceReduced` prop (uiStore hookup in Task 5). `useReducedMotionSafe`, `capabilities.ts` (`canUseWebGL` = webgl2 ∧ cores ≥ 4 ∧ ¬reduced ∧ ¬saveData, memoised; `MAX_DPR` 1.5), `useTilt` (±8° on magnet springs + spotlight position), `useMagnetic` (8 px pull). Root layout wrapped in the provider; placeholder home now uses `staggerWords`/`revealItem`/`fadeUp`/`floatLoop` through `withReduced`. Verified: lint, typecheck, 37 tests (6 files), build (home 144 kB first-load JS).

- **Task 3 (2026-10-08) — design system foundation.** `styles/tokens.css`: full dark token set + `[data-theme='light']` overrides, registered `@property --angle` / `--level`, beam/conic/slider gradients, glow shadows (accent, teal, free, signal, warn, dock, sheet), radii, z-index contract (field 0 · content 10 · dock 20 · drawer 30 · sheet 40 · toast 50), easings/durations. `styles/animations.css`: 15 keyframes (hue-drift, float, breathe, spin-angle, shimmer, stripes, caret, pulse-soft, scanline, grid-drift, glitch-a/b, ripple, spin-slow). `app/globals.css`: Tailwind v4 `@theme inline` mapping (colours, display type scale `text-display-sm/display/display-lg`, `text-2xs`, tracking, glow shadows, `animate-*`), custom variants (`hocus`, `motion-ok`, `reduced`, `light`, `selected`, `streaming`), and 30+ utilities (`num`, `glass`, `glass-strong`, `text-beam`, `bg-beam`, `bg-beam-soft`, `bg-slider-track`, `conic-border(-ring/-mask)`, `shimmer-line`, `dashed-card`, `bg-field-fallback`, `bg-grid-field`, `bg-noise`, `bg-stripes-warn`, `caret-stream`, `scanline-once`, `glitch-text`, `dock-float`, `z-field…z-toast`, `hit-44`, `scrollbar-none`, `perspective-900`, `preserve-3d`); global reduced-motion kill-switch. `lib/fonts.ts`: Space Grotesk (display), Inter (UI), JetBrains Mono (numbers/code) via next/font. Root layout stacks field + grid + noise backdrops. Dev-only `/dev/tokens` gallery (404 in production). Verified: lint, typecheck, 23 tests, `next build` clean (home 142 kB first-load JS, CSS 33 kB).

- **Task 2 (2026-10-08) — env, money, API client.** `lib/env.ts` (Zod-validated `NEXT_PUBLIC_*`, literal references so Next inlines them; hex-address checks for payee/USDC.e); `lib/money.ts` (branded integer `MicroUsd`, `roundUpToTenThousandth`, `applyFee` = cost + 10% rounded up, `formatUsd` → "$0.0008"/"$0.026"/"$2.00", `ratioLabel`, `savingLine`); `lib/api/types.ts` (TEMP Zod schemas mirroring the PDF core tables; `mpp_url` deliberately omitted from the model DTO); `lib/api/keys.ts` (query-key factory + `QUOTE_TTL_MS` 5 min); `lib/api/client.ts` (`apiFetch` with `credentials:'include'`, `X-Requested-With`, schema validation, `ApiError` codes; `apiStream` for `/run`); `lib/api/endpoints.ts` (all proposed routes in one swappable file; `RUN_PATH='/run'`). Verified: lint clean, typecheck clean, 23 tests passing (money 11, client 10, home 2), guard:hosts OK.

- **Task 1 (2026-10-08) — `apps/web` scaffold.** pnpm workspace + root manifest; Next 15.5 / React 19.3 / Tailwind 4.3 / motion 12 / TanStack Query 5 / Zustand 5 / R3F 9 + drei 10 / three 0.170 / Zod 3 installed; strict tsconfig; Next config with CSP + security headers; ESLint 9 flat config (strict type-checked, a11y, import order, bans on `localStorage`/`window.ethereum`, timer ban in session code); Prettier; Vitest + RTL; Playwright (Pixel 7 + desktop); `.env.example`; `guard:hosts` script; seeded design tokens + WebGL-free drifting router field; on-brand placeholder home with Framer Motion word-stagger pitch; home smoke test. Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test` (2 passing), `pnpm guard:hosts`, `pnpm build` (home 142 kB first-load JS), `next start` returns 200 with CSP header.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-08 | `/run` carries the prompt (and optional attachments) instead of a separate message-create call | PDF step 10: the server saves user + assistant messages at run time; one request, one voucher |
| 2026-10-08 | A quote is "fresh" only while the composer draft equals the quoted prompt | PDF: the quote is tied to the exact prompt; editing the draft forces Get quote |
| 2026-10-08 | Auto = top *paid* pick when the user has an allocation | PDF: Auto runs the top pick; the free model is always the fourth option, never the auto choice |
| 2026-10-08 | The ESLint no-timers rule for `lib/tempo/session/**` is enforced literally: even the mock has no latency simulation | PDF: no automatic top-ups; the rule protects the real client when it lands |
| 2026-10-08 | Voucher key is generated under a draft id, then adopted under the channel id after open | The channel id is unknown until the SDK opens it, but the public key must be registered at open |
| 2026-10-08 | Deposit/swap are plain async flows that invalidate the balance query; the UI reacts to the data change | Keeps SDK dialogs out of React state; the BalanceList splash triggers from the balance delta |
| 2026-10-08 | All wallet UX goes through `TempoAccountsAdapter`; the mock runs on testnet/mock and the real SDK is a single file swap | Backend_Gaps_Report §3/§8 unresolved; keeps every flow demoable now |
| 2026-10-08 | SIWE statement: "Sign in to SmartRouter. This does not move any funds." | Clear consent copy; exact fields to confirm (Gaps §6.1) |
| 2026-10-08 | Receipt polling stops for free runs and after 2 h | Free turns never settle on-chain (PDF); bounded polling avoids runaway requests |
| 2026-10-08 | Spend-permission scope facts are rendered from env (`NEXT_PUBLIC_USDCE_ADDRESS`, `NEXT_PUBLIC_SMARTROUTER_PAYEE`) before approval | security.md §2.3: the user sees token, payee and scope before the single passkey tap |
| 2026-10-08 | Explorer base URLs are placeholders in `lib/explorer.ts` | Backend_Gaps_Report §10.3 — unconfirmed |
| 2026-10-08 | Top-up amount shown everywhere = the user's allocation setting (`me.allocation`), default $2 | PDF: "Top up $2" matches the default allocation size |
| 2026-10-08 | Raw HTML in model output is dropped (no rehype-raw) and sanitised | security.md §6: replies are untrusted |
| 2026-10-08 | Images use `next/image` with `unoptimized` for non-object-storage hosts | Mock images come from picsum; production object storage stays optimised |
| 2026-10-08 | Badges and tags that are not actionable render as spans / non-focusable chips | Avoids phantom buttons for assistive tech |
| 2026-10-08 | Slider re-quote is debounced inside the panel (300 ms) | Protects the 402 reads from slider scrubbing (security.md §9) |
| 2026-10-08 | Composer is controlled by `composerStore` (draft/attachments) and emits `onGetQuote(prompt)` / `onRun()`; quoting and running live in the workspace (Task 21) | Keeps the dock reusable for new-chat and chat modes |
| 2026-10-08 | `?first=1` marks a chat created from a description; the workspace (Task 21) auto-fires the first quote from the stored draft | Matches the PDF: the description is quoted immediately so the user can run it straight away |
| 2026-10-08 | CTAs are buttons that `router.push`, not Links inside buttons | Avoids nested interactive elements; MagneticButton stays a real button |
| 2026-10-08 | Sign-in CTA shows a toast until Task 18 | Keeps the landing demoable on mocks without a fake auth flow |
| 2026-10-08 | Mock defaults to signed-in with an open $2 session | Lets the chat workspace be previewed immediately; logout/verify flip `state.authed` |
| 2026-10-08 | Scenario hooks live in the prompt text (`[retry]`, `[fail]`, `[slow]`) | No UI toggles needed to demo failure rules from the PDF |
| 2026-10-08 | `(app)/layout.tsx` stays a server component and delegates to a client `AppShell` | Auth state is client-only (httpOnly cookie on the API origin), so the gate must run in the browser |
| 2026-10-08 | Lane dashes animate by offsetting the `lineDistance` attribute rather than `LineDashedMaterial.dashOffset` | `dashOffset` is not in the three 0.170 typings; attribute shift is portable |
| 2026-10-08 | GlitchText exposes an `sr-only` copy and hides the animated layers | `role="text"` is not a valid ARIA role; one accessible copy, decorative layers |
| 2026-10-08 | FX imperative APIs (trails, bursts) go through `fxStore` with singleton layers mounted in the root layout | Any component can fire effects without prop-drilling refs; one canvas, one SVG |
| 2026-10-08 | RouterField always renders the CSS fallback underneath the WebGL canvas | First paint and low-end devices stay on-brand; WebGL only adds |
| 2026-10-08 | One `Overlay` engine behind Sheet/Dialog/Drawer | Focus trap, Escape, scroll lock, drag dismiss and the SDK-dialog guard are written once |
| 2026-10-08 | `Slider` is a generic detent primitive; Task 13 wraps it with preset labels/weights | Same mechanical feel reusable for Settings default slider |
| 2026-10-08 | `NumberTicker` moved up from Task 7 into Task 6 | PriceTag depends on it |
| 2026-10-08 | Danger buttons have no spring lift/glow | design.md §6: destructive actions are not gamified |
| 2026-10-08 | Media query server snapshot is `false` (mobile) | Mobile-first; desktop upgrades after hydration without mismatch |
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

- SSE event payload shapes are proposed (Gaps §2.2); `can_rerun_free` defaults to false when absent.
- `no_allocation` is surfaced as a toast pointing to the wallet; the PDF flow assumes an open allocation before paid runs.

- `notifyTopUp` is a mock-only endpoint; the real flow may be chain-observed and the call becomes a no-op.
- P-256 ECDSA with SHA-256 is assumed for the voucher signer (Gaps §3.3).

- Mock deposit always adds $2 USDC.e and mock swap folds every other token into USDC.e.

- Mock signatures are deterministic `0xmock…` strings; the mock API accepts any signature.
- Tempo chain ids (4217 testnet / 4216 mainnet) are placeholders.

- Settings exposes both the weekly limit stepper and the PDF's $5/day per-user cap as copy (Gaps §9.2).
- Allocation stepper bounds ($1–$50) and limit bounds ($5–$500/wk) are UI guesses, not PDF values.

- MessageBubble treats `result_ref` on a history message as an image (mime image/jpeg); audio results arrive via job polling (Task 23).

- Price/speed bar scores are derived client-side from the four options (cheapest = 1); quality comes from the API's rescaled `quality` field.

- Landing `SavingProof` numbers are PDF constants, not fetched; the live quote panel (Task 13) uses API prices.

- Mock `/run` reads the latest user message for scenario hooks, so the app must append the user message before calling `/run` (it does from Task 21).

- `AppShell` treats only `unauthorized` as a redirect; `network` errors show an inline alert so offline users don't bounce to the landing page.

- `RouterFieldScene` point count is chosen by viewport width at mount (≥1024 → 12k, else 4k); not re-evaluated on resize.
- Orb/field activity comes from `streamStore.selectActivity` (share of live streams); will read real SSE state from Task 21.

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

- **2026-10-08** — Executed **Task 21** (sse client, useRun, ChatWorkspace, chat route, prompt-in-run contract, 2 test files, 5 fixes). No new packages. Next: "execute task 22".

- **2026-10-08** — Executed **Task 20** (voucher signer, SessionClient + mock + stub, spend permission, three hooks, shell/settings wiring, tests). No new packages. Next: "execute task 21".

- **2026-10-08** — Executed **Task 19** (useBalance, deposit, swap, shell wiring, test). No new packages. Next: "execute task 20".

- **2026-10-08** — Executed **Task 18** (Tempo adapter interface + mock, SIWE, useAuth, landing/settings/shell wiring, tests). Note: Task 17's tracking ran before its last test fix; the fix landed in this range. No new packages. Next: "execute task 19".

- **2026-10-08** — Executed **Task 17** (useReceipt, TxHashReveal, ReceiptView/Drawer, deep link, CompareSplit, tests). Phase 2 complete. No new packages. Next: "execute task 18".

- **2026-10-08** — Executed **Task 16** (Switch, explorer, useSettings, 9 wallet components, settings page, shell wiring, tests). No new packages. Next: "execute task 17".

- **2026-10-08** — Executed **Task 15** (useSession, useFreeUsage, AllocationHUD, TopUpBar, FreeQuotaMeter, tests). No new packages. Next: "execute task 16".

- **2026-10-08** — Executed **Task 14** (markdown, useChat, StreamText, MessageBubble, Thread, MediaCard, JobCard, thumbs, tests). No new packages. Next: "execute task 15".

- **2026-10-08** — Executed **Task 13** (useQuote, PresetSlider, bars, TypeLine, tags, SuggestionChip, ModelCard, RecommendationPanel, tests). No new packages. Next: "execute task 14".

- **2026-10-08** — Executed **Task 12** (Composer, RunButton, QuoteRing, ModelPill, ModelPicker, useModels, 2 test files). No new packages. Next: "execute task 13".

- **2026-10-08** — Executed **Task 11** (useChats, ChatList, NewChat, page, tests; apiFetch generic fix). No new packages. Next: "execute task 12".

- **2026-10-08** — Executed **Task 10** (5 landing components, page, tests; IntersectionObserver stub). No new packages. Next: "execute task 11".

- **2026-10-08** — Executed **Task 9** (MSW mocks: fixtures, state, SSE, handlers, entries, MockProvider, 5 handler tests). Added `msw`. Next: "execute task 10".

- **2026-10-08** — Executed **Task 8** (shell/providers/TopBar/AppShell/placeholders, 1 test). No new packages. Next: "execute task 9".

- **2026-10-08** — Executed **Task 7** (12 FX source files, 4 test files, dev gallery, 4 follow-up fixes). No new packages. Dev-server command given to the user; builds skipped while :3000 is in use. Next: "execute task 8".

- **2026-10-08 (session 7)** — Executed **Task 6** (17 primitives/support files, 4 test files, dev gallery). No new packages. Next: "execute task 7" (FX layer: GlitchText, HoloCard, LiquidRing, GlowTrail, ParticleBurst, FloatingDock, RouterOrb, RouterField).

- **2026-10-08 (session 6)** — Executed **Task 5** (six stores, IndexedDB helper, PreferencesProvider, 22 new tests). No new packages. Next: "execute task 6" (UI primitives).

- **2026-10-08 (session 5)** — Executed **Task 4** (springs, variants, reduced-motion provider/hook, WebGL gate, tilt/magnetic hooks, 14 new tests). jsdom canvas stubbed in test setup. No new packages. Next: "execute task 5" (Zustand stores; wire `uiStore.forceReducedMotion` into the provider).

- **2026-10-08 (session 4)** — Executed **Task 3** (tokens, keyframes, Tailwind theme + utility layer, fonts, layout backdrops, dev token gallery). Pinned `outputFileTracingRoot` to the monorepo. No new packages. Next: "execute task 4" (motion library + reduced-motion provider).

- **2026-10-08 (session 3)** — Executed **Task 2** (env, money helpers, API types/keys/client/endpoints + 21 new tests). No new packages added. Next: "execute task 3" (design tokens, fonts, Tailwind theme, global styles).

- **2026-10-08 (session 2)** — Wrote `Backend_Gaps_Report.md` (11 sections, prioritised questions); pushed `main` to origin; executed **Task 1** (see Completed features). Next: "execute task 2" (env validation, money helpers, API client).

- **2026-10-08** — Read the PDF (17 pages incl. system diagram p.2 and build plan p.16). Generated and committed: PRD.md, Technical_Requirements.md, User_Journey.md, UI_UX_Brief.md, Implementation_Plan.md, security.md, architecture.md, rules.md, agent.md, design.md, memory.md, Tasks.md.
