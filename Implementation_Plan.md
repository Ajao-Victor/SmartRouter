# SmartRouter — Frontend Implementation Plan

> Calendar from `SmartRouter — Build Architecture 2.pdf`: seven build days Oct 5–11, submission **Oct 12** (Colosseum). Today is **Oct 8**. The backend (API, worker, adapters, catalog, smoke test) is described as built or in progress; the frontend "joins later as `apps/web`". If a day slips, **cut Compare mode and music first** (PDF).

Detailed, executable steps live in `Tasks.md`. This document is the phased view.

---

## Phase 0 — Alignment (½ day, Oct 8 AM)

| Item | Output |
|---|---|
| Confirm REST contract against the Backend Architecture doc (not provided to us) | `Technical_Requirements.md` §5 reconciled; shared types package path known |
| Confirm the browser session/voucher client package | `SessionClient` adapter implemented against the real package |
| Confirm testnet API URL and mock adapter behaviour | `.env.local` for testnet |
| Confirm upload size/type limits | Composer validation constants |

Exit criteria: typed API client can hit `/api/me` on testnet with a cookie.

---

## Phase 1 — Setup (Oct 8)

**Goal:** `apps/web` boots in the monorepo with the design system and app shell.

1. Scaffold Next.js (App Router, TS, Tailwind) at `apps/web`; wire pnpm workspace; import shared types from the API package.
2. Install Framer Motion, TanStack Query, Zustand, three/@react-three/fiber/drei, lucide-react, Zod, Sentry.
3. Design tokens (CSS variables), fonts via `next/font`, Tailwind theme mapping.
4. Base primitives: Button, PriceTag, Sheet, Dialog, Drawer, Toast, Skeleton, Attribution.
5. App shell: TopBar, route layout, Testnet banner, reduced-motion provider.
6. Lint/format/test tooling per `rules.md`; CI check script.

Exit criteria: `pnpm dev` renders the shell with tokens; `pnpm lint && pnpm typecheck && pnpm test` pass.

---

## Phase 2 — Core UI (Oct 8 PM – Oct 9)

**Goal:** every launch screen exists with mocked data and the signature animations.

1. Landing: hero, live-saving proof strip, task chips, CTA pair, coming-soon teasers.
2. Chat workspace: thread, MessageBubble, StreamText, Composer (textarea, attach, model pill, Compare toggle, Run with price).
3. Recommendation panel: 4 ModelCards (top 2 + best quality + free), Slider with three detents, QuoteRing (5-min), suggestion chip, attribution.
4. Allocation HUD with ok / low / used / topping-up states; Top up · Continue free pair.
5. Wallet sheet: balances per token, Deposit, Swap to USDC.e (conditional), allocation controls, ComingSoonCards + waitlist form.
6. Receipt drawer; Settings page; Chat list.
7. Media/Job cards for image/music results.
8. Futuristic layer per `design.md`: WebGL background field, router orb, card physics, HUD liquid ring.

Exit criteria: all journeys in `User_Journey.md` click through on mock data; mobile viewport verified.

---

## Phase 3 — Web3 + Backend integration (Oct 9 – Oct 10)

**Goal:** real money flow on testnet, then mainnet.

1. Tempo Accounts SDK + Tempo Wallet adapter: passkey sign-in dialog over the page; SIWE → httpOnly cookie.
2. Wallet balance live from Tempo; `wallet_deposit` and `wallet_swap` dialogs; refetch on close.
3. Spend permission (USDC.e, scoped to session open/top-up with SmartRouter as payee, expiry) — one passkey tap; non-extractable key; Revoke in Settings.
4. Session: open channel (`maxDeposit` = allocation), local voucher signer as `authorizedSigner`; register with API.
5. Quote → allocation check → cumulative voucher → `/run`; SSE parser (token, heartbeat 15 s, retry, file, job, done, error).
6. Free model path (no voucher, 30/day counter); auto free fallback.
7. Top-up (no close); session polling; idle-close messaging.
8. Async jobs polling (Suno, StableStudio); image file results.
9. Feedback (thumbs) and Compare votes; Compare parallel streams.
10. Receipts incl. tx hash after settlement; waitlist POST.
11. Sentry; error semantics table from `Technical_Requirements.md` §5.4.

Exit criteria: on testnet, a full demo path runs: deposit → allocation → task → recommendation → result → top-up → receipt. Then promote to mainnet config.

---

## Phase 4 — Polish & launch (Oct 10 – Oct 11)

1. Performance: lazy-load WebGL, reduced-motion fallbacks, low-end device detection, bundle budget.
2. Accessibility pass: focus traps, live regions, contrast on glass.
3. Copy pass against PDF strings; "available via MPP" and attribution everywhere required.
4. Beta onboarding from Nigeria: verify deposit paths visible on day 1; crypto transfer always works.
5. Demo video path rehearsal (3 min) with recorded screens.
6. README + architecture diagram in the public repo; `memory.md` finalised.
7. PWA manifest (optional, PDF says later).

Exit criteria: 20+ beta users can run real tasks; demo video recorded; repo public; submission Oct 12.

---

## Risk register (frontend-relevant, from PDF)

| Risk | Mitigation in the frontend |
|---|---|
| Deposit paths vary by country | Always show crypto transfer; test from Nigeria day 1 |
| Spend-limit coverage of session deposits undocumented | Settings copy hedges; rely on call scope + caps |
| Session receipts have no tx hash until settlement | Show session id immediately; tx hash field fills in later with animation |
| Gateways change price / go down | Surface "Retrying on next model — no extra charge"; price ceiling enforced server-side |
| Free model costs | Visible 30/day counter; disable Free when exhausted |
| Schedule slip | Compare and music UI isolated behind feature flags so they can be cut cleanly |
