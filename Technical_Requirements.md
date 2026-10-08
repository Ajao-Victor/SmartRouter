# SmartRouter — Technical Requirements (Frontend)

> Scope: the Next.js frontend that lives at `apps/web` inside the existing pnpm TypeScript monorepo and calls the Hono API.
> Backend facts come from `SmartRouter — Build Architecture 2.pdf`. Frontend-only choices (state library, animation stack) are **our decisions** and are labelled as such. Anything the PDF does not specify is marked **PROPOSED** or **GAP**.

---

## 1. Monorepo position (from PDF)

| Layer | Choice (PDF) | Frontend implication |
|---|---|---|
| Monorepo | One TypeScript monorepo, **pnpm** | Frontend is `apps/web`; shared packages live in `packages/*` |
| API | **Hono on Node** (Heroku web dyno); `mppx/hono` session middleware on `/run`; SSE with 15 s heartbeat | All data access goes through the API; the browser never calls providers directly |
| Worker | Node + pg-boss | Async jobs (Suno, StableStudio) are polled by the frontend |
| Web app | **Next.js + Tailwind**, PWA later, **mobile-first**, **imports shared types from the API** | Type-safe client; no duplicated DTOs |
| Hosting | Heroku pipeline `smartrouter-testnet → smartrouter-mainnet`, deploys from GitHub | Two env configs: testnet (mock paid models) and mainnet |
| Database | Heroku Postgres + Drizzle; money as **integer micro-USD** | Frontend formats micro-USD → `$0.0008` style strings; never does money math in floats for display rounding |
| Cache | Heroku Key-Value Store (Redis) — rate limits and quote cache only | Quote expiry (5 min) must be reflected client-side with a countdown |
| Wallet & auth | **Tempo Accounts SDK** (frontend) + **Sign-In with Ethereum**; backend verifies; **httpOnly session cookie** | Frontend never stores auth tokens in JS-accessible storage |
| Payments in | mppx server, `tempo.session` on `/run`, USDC.e | Browser signs cumulative vouchers with a local signer |
| Files | S3-compatible object storage | Generated images/songs are URLs returned by the API |
| Monitoring | Sentry | Frontend Sentry SDK with DSN from env |

## 2. Frontend tech stack

### 2.1 Fixed by the PDF
- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Tempo Accounts SDK** with the **Tempo Wallet adapter** (passkey sign-in; sign-in / approval / deposit screens rendered as dialogs over our page)
- Shared types imported from the API package
- PWA: later (not launch)

### 2.2 Our decisions (frontend-only)
| Concern | Choice | Why |
|---|---|---|
| Server state | **TanStack Query v5** | Catalog, chats, quotes, polling async jobs; built-in refetch/polling/stale handling |
| Client/UI state | **Zustand** (small slices) | Slider, composer draft, dialogs, allocation HUD, streaming buffers |
| Animation | **Framer Motion** (`motion/react`) | Variants, layout animations, gestures, `AnimatePresence` |
| WebGL | **three.js + @react-three/fiber + @react-three/drei** | Background field, orb, 3D wallet scenes (see `design.md`) |
| Forms | native + Zod validation | Lightweight; Zod schemas shared with API where possible |
| Icons | lucide-react | Consistent stroke icons |
| Fonts | `next/font` | Self-hosted, no layout shift |
| Charts (compare/price bars) | inline SVG | No chart lib needed at this scale |
| Tests | Vitest + React Testing Library; Playwright smoke | Lightweight, hackathon-appropriate |
| Lint/format | ESLint (next/core-web-vitals, typescript-eslint, jsx-a11y) + Prettier | See `rules.md` |

### 2.3 Environment variables (frontend)
| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Hono API base URL (testnet or mainnet app) |
| `NEXT_PUBLIC_TEMPO_NETWORK` | `testnet` \| `mainnet` |
| `NEXT_PUBLIC_SMARTROUTER_PAYEE` | SmartRouter payee address for session open/top-up (scoped spend permission) |
| `NEXT_PUBLIC_USDCE_ADDRESS` | USDC.e token address on the active network |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry |
| `NEXT_PUBLIC_FEE_BPS` | Display-only fee hint (API is authoritative; 10% per PDF) |

No provider keys, treasury keys or hot-wallet keys ever exist in the frontend environment (PDF: "no provider or treasury keys in the browser").

## 3. State management specification

### 3.1 Server state (TanStack Query keys)
| Key | Data | Refresh policy |
|---|---|---|
| `['me']` | user: tempo_address, country, slider, allocation, weekly_limit, auto_free_fallback | On focus; after settings mutation |
| `['wallet','balance']` | Balances read live from Tempo (never stored by API) | Every 15 s while wallet sheet open; on deposit/swap dialog close |
| `['session','current']` | channel_id, deposit, highest_voucher, counted, settled, status | After every run; every 30 s |
| `['models']` | Model catalog (id, provider, label, task_types, price_est, latency, verified, active) | Stale 5 min |
| `['chats']` | Chat list | On mutation |
| `['chat', id]` | Chat + messages | On mutation; appended optimistically during stream |
| `['quote', chatId, promptHash, modelId, slider]` | Quote + recommendations | **GC after 5 min** (PDF quote validity) |
| `['job', jobId]` | Async job status (Suno, StableStudio) | `refetchInterval` 3 s until done |
| `['request', id]` | Receipt: price, provider_cost, latency_ms, session id, voucher amount, provider receipt, tx hash after settlement | On open |
| `['free','usage']` | messages used today of 30 | After each free turn |

### 3.2 Client state (Zustand slices)
| Slice | Fields | Notes |
|---|---|---|
| `uiStore` | activeDialog, walletSheetOpen, compareMode, theme | Dialog stack is single-depth |
| `composerStore` | draft, attachments[], category, slider override | Persist draft per chat in memory only |
| `allocationStore` | remainingMicroUsd, lowThreshold, lastVoucherAmount | Mirrors server session; drives HUD animations |
| `streamStore` | per-messageId: tokens[], status (`idle|streaming|done|error|retrying`), heartbeatAt | Fed by the SSE parser |
| `signerStore` | authorizedSigner public key, channelId, cumulative voucher total | **Private key lives in a non-extractable WebCrypto key**, never in Zustand state |

### 3.3 Money
- All amounts from the API are **integer micro-USD** (PDF). Store as `number` (safe < 2^53) or `bigint`; format with a single `formatUsd(micro)` helper that rounds **up** to $0.0001 for prices (PDF pricing rule) and shows 2–4 decimals contextually.

## 4. Web3 wallet integration

### 4.1 Sign-in (PDF)
1. `Connect` → Tempo Accounts SDK with Tempo Wallet adapter opens the passkey sign-in dialog **over** our page.
2. Frontend obtains the Tempo address; runs **Sign-In with Ethereum**: request nonce → sign message (passkey or plain wallet) → POST to API → API sets **httpOnly cookie**.
3. Subsequent API calls use `credentials: 'include'`. No token in localStorage.

### 4.2 Deposit (PDF: `wallet_deposit`)
- Open Tempo's deposit dialog; user picks chain, token, amount; paths vary by region (Apple Pay, transfer from another wallet, crypto, MACH, bridging via LayerZero/Bungee/Relay).
- On close → refetch `['wallet','balance']`.

### 4.3 Swap (PDF: `wallet_swap`)
- If balance holds a non-USDC.e Tempo stablecoin (USDC.e, OUSD, pathUSD, USDT0, …), show a one-tap **Swap to USDC.e** that opens the wallet's swap screen on Tempo's built-in DEX.

### 4.4 Spend permission (PDF)
- First run only: request one **access key** limited to USDC.e, scoped to the session contract's open + top-up calls with SmartRouter as payee, with an expiry. One passkey tap.
- The key is a **non-extractable browser key**.
- Settings exposes **Revoke** (PDF: user can revoke anytime).

### 4.5 Session (agent allocation) — PDF
- Open channel with `maxDeposit = allocation` (default $2).
- Generate a local **voucher signer** keypair; register it as the channel's `authorizedSigner` (TIP-1034).
- Per request: sign a **cumulative** voucher for the quoted price; send with `/run`.
- Top-up: call the session's top-up (no close) on tap. **Never automatic.**
- Network fees are sponsored (Tempo Fee Payer API) — the UI must never show a gas prompt or a fee line other than SmartRouter's fee.

> **GAP:** the PDF names `mppx` for the server and the Tempo Accounts SDK for auth/deposit; it does not name the browser-side package used to open channels and sign vouchers. Treat the session client as an adapter interface (`SessionClient`) so the concrete package can be swapped once confirmed.

## 5. API connection points

### 5.1 Confirmed by the PDF
| Endpoint | Method | Purpose | Notes |
|---|---|---|---|
| `/run` (also written `/api/run`) | POST | Run a quoted request | Body carries the quote + signed session voucher. `mppx/hono` session middleware. Free turns skip the voucher. Response: **SSE** for text (heartbeat every 15 s); files for images; a job reference for Suno/StableStudio to be polled |
| Provider `402` reads | — | Quote source | **Server-side only**; the browser never talks to providers |
| Wallet balance | — | Read from Tempo | Via the Tempo SDK, not the API |

### 5.2 PROPOSED contract (not in the PDF — derived from its tables and flows; to be reconciled with the Backend Architecture doc)

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/auth/nonce` | GET | — | `{ nonce }` |
| `/api/auth/verify` | POST | `{ message, signature, kind: 'passkey'\|'wallet' }` | sets cookie; `{ user }` |
| `/api/auth/logout` | POST | — | 204 |
| `/api/me` | GET | — | `users` row fields (no secrets) |
| `/api/me/settings` | PATCH | `{ slider?, allocation?, weekly_limit?, auto_free_fallback? }` | `{ user }` |
| `/api/models` | GET | `?task=` | `models[]` (active + verified only) |
| `/api/chats` | GET/POST | POST `{ task_type?, first_prompt? }` | chat(s) |
| `/api/chats/:id` | GET/PATCH | PATCH `{ current_model_id? }` | chat + messages |
| `/api/chats/:id/quote` | POST | `{ prompt, attachments?, model_id?, slider? }` | `{ classification, recommendations[4], quote, suggestion? }` |
| `/api/sessions` | POST | `{ channel_id, authorized_signer }` | `user_sessions` row |
| `/api/sessions/current` | GET | — | `user_sessions` row |
| `/api/jobs/:id` | GET | — | `{ status, result_ref? }` |
| `/api/requests/:id` | GET | — | receipt fields incl. `tx_hash` once settled |
| `/api/feedback` | POST | `{ message_id, vote: 'up'\|'down' }` | 204 |
| `/api/compare-votes` | POST | `{ chat_id, left_request_id, right_request_id, pick }` | 204 |
| `/api/free/usage` | GET | — | `{ messages, limit: 30 }` |
| `/api/waitlist` | POST | `{ email, country, interest: 'naira'\|'credits' }` | 204 |

### 5.3 PROPOSED SSE event schema for `/run` (assumption)
```
event: meta        data: { request_id, model_id, quote_id, session_id }
event: token       data: { text }
event: heartbeat   data: {}               // every 15 s (PDF)
event: retry       data: { from_model_id, to_model_id, reason }   // retry once on next-ranked model, no extra charge
event: file        data: { url, mime }    // images
event: job         data: { job_id }       // Suno / StableStudio — poll /api/jobs/:id
event: done        data: { request_id, price, provider_cost, latency_ms, voucher_amount }
event: error       data: { code, message, can_rerun_free: boolean }
```

### 5.4 Error semantics the UI must handle (PDF failure rules)
| Condition | UI behaviour |
|---|---|
| Quote > remaining allocation | Show **Top up** and **Continue free** side by side; auto-continue free if `auto_free_fallback` |
| Provider error / timeout / price above quote | Show "Retrying on {next model}" inline; no extra charge |
| Second failure | Offer **Rerun on free model** |
| Quote expired (5 min) | Re-quote automatically before run |
| Free quota exhausted (30/day) | Disable Free option with reason; show Top up |
| Rate limit (30 req/min) | Toast + brief composer cooldown |
| Session idle-closed (24h) | Prompt to open a new allocation |

## 6. Performance & delivery
- Mobile-first; first contentful paint target < 2 s on mid-range Android over 3G-ish networks (Nigeria beta).
- WebGL scenes are lazy-loaded, respect `prefers-reduced-motion`, and degrade to CSS gradients when WebGL is unavailable or on low-end devices.
- Streaming text renders incrementally with `requestAnimationFrame` batching to avoid layout thrash.
- Images/songs are served from object storage URLs; use `next/image` with remote patterns.

## 7. Accessibility
- All motion gated by `prefers-reduced-motion`.
- Dialogs trap focus; the Tempo SDK dialogs are third-party and must not be obscured by our overlays (z-index contract in `architecture.md`).
- Colour contrast ≥ 4.5:1 for text on all glass/glow surfaces.

## 8. Gaps summary
1. Backend Architecture doc not provided → REST contract is proposed, not confirmed.
2. SSE payload shapes → proposed.
3. Browser session/voucher library → adapter pattern until confirmed.
4. Upload size/type limits → values TBD.
5. Whether testnet mock exposes identical endpoints → assumed yes (PDF: paid models run on `mock` adapter on testnet).
