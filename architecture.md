# SmartRouter — Frontend Architecture

> The frontend is `apps/web` in the pnpm monorepo described in `SmartRouter — Build Architecture 2.pdf`. It calls the Hono API and the Tempo Accounts SDK and nothing else.

---

## 1. System context (from the PDF diagram)

```
┌──────────────┐  prompt   ┌───────────────────────────────┐   data   ┌───────────────────┐
│ You (web app)│──────────▶│ SmartRouter backend           │◀─────────│ Leaderboards       │
│ Prompt, pick,│           │  Classifier + ranker          │          │ LMArena, Artificial│
│ run          │           │  MPP endpoint /api/run        │          │ Analysis, OpenRouter│
└──────┬───────┘           │  MPP gateway (mppx)           │          └───────────────────┘
       │ signs in          │   provider adapters, sessions │   MPP    ┌───────────────────┐
┌──────▼───────┐  pays     │   and charges                 │─────────▶│ AI models via MPP  │
│ Tempo wallet │──────────▶└───────────────┬───────────────┘          │ OpenAI, Anthropic, │
│ Passkey,     │                           │ MPP payments             │ OpenRouter,DeepSeek│
│ allocation   │                           ▼                          │ Mistral, Groq,     │
└──────▲───────┘           ┌───────────────────────────────┐ settles  │ Perplexity, fal.ai,│
       │ fund              │ Tempo network, USDC.e         │◀─────────│ StableStudio, Suno │
┌──────┴───────┐           │ user wallets & allowances,    │          └───────────────────┘
│ Deposit opts │           │ SmartRouter treasury & hot    │
│ any token,   │           │ wallet, all MPP settlements   │
│ Apple Pay,   │           └───────────────────────────────┘
│ bridge, swap │
└──────▲───────┘
       │ later
┌──────┴───────┐
│ Naira, MPP   │  (dashed — coming soon)
│ Credits      │
└──────────────┘
```

The frontend is the "You (web app)" and "Tempo wallet" boxes. Everything in the dashed backend box is server-side.

## 2. Monorepo layout

```
smartrouter/                      (pnpm workspace — existing)
├── apps/
│   ├── api/                      Hono API (existing — owns payments, routing, records)
│   ├── worker/                   pg-boss jobs (existing)
│   └── web/                      ← THIS FRONTEND
├── packages/
│   ├── shared/                   shared types/Zod schemas (name per API team; imported by web)
│   └── ...
└── docs: PRD.md, Technical_Requirements.md, … (this suite)
```

> If `apps/web` is built in this repo before the monorepo is merged, keep the same internal structure so it drops in unchanged.

## 3. `apps/web` folder structure

```
apps/web/
├── app/                                  Next.js App Router
│   ├── layout.tsx                        fonts, providers, Testnet banner, WebGL backdrop slot
│   ├── page.tsx                          Landing
│   ├── (app)/
│   │   ├── layout.tsx                    authed shell: TopBar + AllocationHUD + WalletSheet
│   │   ├── chat/
│   │   │   ├── page.tsx                  New chat (category chips / describe task)
│   │   │   └── [chatId]/page.tsx         Chat workspace
│   │   ├── settings/page.tsx
│   │   └── receipts/[requestId]/page.tsx (deep link; also opens as drawer)
│   ├── api/                              (none — all API calls go to the Hono API; no Next route handlers)
│   └── globals.css                       tokens, Tailwind layers
├── components/
│   ├── ui/                               primitives: Button, PriceTag, Sheet, Dialog, Drawer, Toast, Skeleton, Chip, Tabs, Tooltip
│   ├── fx/                               futuristic layer (design.md): RouterField (WebGL), RouterOrb, GlowTrail, LiquidRing, HoloCard, ParticleBurst, GlitchText, FloatingDock
│   ├── landing/                          Hero, SavingProof, TaskChips, ComingSoonTeasers
│   ├── chat/                             Thread, MessageBubble, StreamText, Composer, ModelPill, ModelPicker, SuggestionChip, CompareSplit, MediaCard, JobCard
│   ├── recommend/                        RecommendationPanel, ModelCard, QualityPriceSpeedBars, Slider, QuoteRing, Attribution
│   ├── wallet/                           WalletSheet, BalanceList, DepositButton, SwapButton, AllocationControls, SpendPermissionCard, ComingSoonCard, WaitlistForm
│   ├── allocation/                       AllocationHUD, TopUpBar (Top up | Continue free), FreeQuotaMeter
│   ├── receipt/                          ReceiptDrawer, ReceiptRow, TxHashReveal
│   └── layout/                           TopBar, TestnetBanner, ReducedMotionProvider
├── lib/
│   ├── api/
│   │   ├── client.ts                     fetch wrapper: base URL, credentials, X-Requested-With, error mapping
│   │   ├── endpoints.ts                  typed functions per endpoint (Technical_Requirements §5)
│   │   ├── sse.ts                        /run SSE parser → events
│   │   └── types.ts                      re-exports from packages/shared
│   ├── tempo/
│   │   ├── accounts.ts                   Tempo Accounts SDK init + Tempo Wallet adapter
│   │   ├── siwe.ts                       Sign-In with Ethereum flow
│   │   ├── deposit.ts                    wallet_deposit dialog
│   │   ├── swap.ts                       wallet_swap dialog
│   │   ├── spendPermission.ts            scoped access key (USDC.e, payee, open/top-up, expiry), revoke
│   │   └── session/
│   │       ├── SessionClient.ts          interface: open(maxDeposit), topUp(amount), signVoucher(cumulative), status()
│   │       ├── voucherSigner.ts          WebCrypto non-extractable key, IndexedDB persistence
│   │       └── impl.*.ts                 concrete adapter once the browser package is confirmed (GAP)
│   ├── money.ts                          micro-USD helpers, formatUsd (round up to $0.0001)
│   ├── markdown.ts                       sanitised renderer
│   ├── motion/                           Framer Motion variants library (design.md)
│   │   ├── variants.ts
│   │   ├── springs.ts
│   │   └── useReducedMotionSafe.ts
│   └── env.ts                            Zod-validated NEXT_PUBLIC_* env
├── stores/                               Zustand slices: ui, composer, allocation, stream, signer
├── hooks/                                useMe, useBalance, useSession, useModels, useChat, useQuote, useRun, useJob, useReceipt, useFreeUsage
├── styles/                               tokens.css, animations.css
├── public/                               icons, manifest (PWA later)
├── tests/                                vitest + RTL; e2e/ (Playwright)
├── next.config.ts                        CSP headers, remotePatterns
├── tailwind.config.ts
└── .env.example
```

## 4. Component hierarchy (chat workspace)

```
(app)/layout
├── ReducedMotionProvider
├── RouterField (WebGL backdrop, lazy, fixed z-0)
├── TopBar
│   ├── Logo (RouterOrb mini)
│   ├── ChatTitle (GlitchText reveal when free model writes the title)
│   └── AllocationHUD (LiquidRing) ── TopUpBar
├── WalletSheet (portal, z-40)
│   ├── BalanceList → SwapButton (conditional) · DepositButton
│   ├── AllocationControls · SpendPermissionCard (Revoke)
│   └── ComingSoonCard ×2 → WaitlistForm
└── chat/[chatId]/page
    ├── Thread
    │   └── MessageBubble (×n)
    │       ├── ModelTag ("via MPP" / "Free · Llama 3.1 8B")
    │       ├── StreamText | MediaCard | JobCard
    │       ├── RetryNotice ("Retrying on X — no extra charge")
    │       ├── ThumbsFeedback
    │       └── ReceiptLink → ReceiptDrawer (portal, z-30)
    ├── CompareSplit (feature-flagged) → two Thread columns + PickButton
    ├── RecommendationPanel (AnimatePresence)
    │   ├── Slider (Cheapest / Balanced / Best quality)
    │   ├── ModelCard ×4 (HoloCard) — top 2, best quality, free
    │   ├── QuoteRing (5 min)
    │   ├── SuggestionChip
    │   └── Attribution
    └── Composer (FloatingDock)
        ├── Textarea · AttachButton · ModelPill → ModelPicker
        ├── CompareToggle (flag)
        └── RunButton (PriceTag inside; ParticleBurst on run)
```

## 5. Data flow

### 5.1 Quote → run (paid)
```
Composer.submit(prompt)
  → useQuote.mutate({chatId, prompt, modelId?, slider})      POST /api/chats/:id/quote
  → RecommendationPanel renders 4 cards + QuoteRing(5m)
  → user picks / Auto
  → allocation check (allocationStore.remaining ≥ quote.price)
      ├─ no  → TopUpBar (Top up | Continue free) or auto-free
      └─ yes → SessionClient.signVoucher(cumulative + price)
             → useRun.start({quoteId, voucher})               POST /run (SSE)
             → sse.ts → streamStore[messageId] (token/heartbeat/retry/file/job/done/error)
             → on done: invalidate ['chat',id], ['session','current'], ['free','usage'] (if free)
             → ReceiptLink available; TxHashReveal subscribes to ['request',id] until tx_hash
```

### 5.2 Free turn
Same path without `signVoucher`; `is_free: true`; FreeQuotaMeter increments.

### 5.3 Async job (Suno / StableStudio)
`/run` → `event: job` → `useJob(jobId)` polls `/api/jobs/:id` every 3 s → JobCard → MediaCard on done.

### 5.4 Wallet
Tempo SDK is the source of truth for balances (PDF: never stored). `useBalance` reads via SDK; `useSession` reads `/api/sessions/current` for allocation.

## 6. Interface with backend/AI layers (PDF mapping)

| PDF layer | Frontend touchpoint |
|---|---|
| Classifier (keyword rules; free model for ambiguous) | Response of quote endpoint: `classification {task_type, complexity, language, needs_web}` → tags in RecommendationPanel |
| Ranker (score = w_q·Q + w_p·(1−P) + w_s·S + T) | `recommendations[4]` with `score`, `price`, `speed_label`, `reason`; slider sends preset name or weights |
| Quote (402 read + 10% fee, 5 min) | `quote {id, price, expires_at, prompt_hash}` → QuoteRing, RunButton price |
| `/run` with mppx/hono session middleware | `useRun` + `sse.ts` |
| Provider adapters (stream / file / async job) | `event: token` / `event: file` / `event: job` |
| Free model (Cloudflare, Groq backup) | `is_free`, FreeQuotaMeter (30/day) |
| Settlement (every $1 or hourly) | `tx_hash` on receipt, TxHashReveal |
| Worker: idle close 24h | WalletSheet "Returned $x" message from session status `closed` |
| Worker: summarise chats, write titles | `chat.summary`, `chat.title` (untrusted text) |
| Feedback / Compare votes → engine | POST feedback / compare-votes |
| Waitlist table | WaitlistForm |

## 7. Z-index contract

| Layer | z |
|---|---|
| RouterField (WebGL) | 0 |
| Page content | 10 |
| FloatingDock (composer) | 20 |
| Drawers (receipt) | 30 |
| Sheets (wallet) / our Dialogs | 40 |
| Toasts | 50 |
| **Tempo SDK dialogs** | above all — we never set z ≥ 1000 and never render a full-screen opaque layer while an SDK dialog is open |

## 8. Rendering strategy

- Landing: static + client islands (WebGL).
- App routes: client components under a server layout; data via TanStack Query (no RSC data fetching for authed data because the cookie is httpOnly and scoped to the API origin).
- Streaming via `fetch` + `ReadableStream` (not `EventSource`, to allow POST body + credentials).

## 9. Feature flags

`NEXT_PUBLIC_FLAG_COMPARE`, `NEXT_PUBLIC_FLAG_MUSIC` — default on; flip off to cut scope per the PDF's cut order.
