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
| Phase 1 Setup | 🟡 Task 1 done (Oct 8, 2026); Tasks 2–8 next |
| Phase 2 Core UI | ⬜ |
| Phase 3 Integration | ⬜ |
| Phase 4 Polish | ⬜ |

## Completed features

- **Task 1 (2026-10-08) — `apps/web` scaffold.** pnpm workspace + root manifest; Next 15.5 / React 19.3 / Tailwind 4.3 / motion 12 / TanStack Query 5 / Zustand 5 / R3F 9 + drei 10 / three 0.170 / Zod 3 installed; strict tsconfig; Next config with CSP + security headers; ESLint 9 flat config (strict type-checked, a11y, import order, bans on `localStorage`/`window.ethereum`, timer ban in session code); Prettier; Vitest + RTL; Playwright (Pixel 7 + desktop); `.env.example`; `guard:hosts` script; seeded design tokens + WebGL-free drifting router field; on-brand placeholder home with Framer Motion word-stagger pitch; home smoke test. Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test` (2 passing), `pnpm guard:hosts`, `pnpm build` (home 142 kB first-load JS), `next start` returns 200 with CSP header.

## Decisions log

| Date | Decision | Why |
|---|---|---|
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

- `next.config.ts`: Tempo SDK origins for CSP come from `NEXT_PUBLIC_TEMPO_ORIGINS` (empty until Backend_Gaps_Report §8 is answered); dev CSP allows `unsafe-eval` for HMR.
- `tailwind.config.ts` only scopes content; theme mapping lives in CSS `@theme inline` (Tailwind v4 convention).
- `eslint.config.mjs`: `next/core-web-vitals` already registers jsx-a11y/import/react-hooks plugins, so only their rule sets are spread (re-registering throws in ESLint 9).
- `vitest.config.ts`: `passWithNoTests: true` so packages without tests don't fail `check`.

## Session log

- **2026-10-08 (session 2)** — Wrote `Backend_Gaps_Report.md` (11 sections, prioritised questions); pushed `main` to origin; executed **Task 1** (see Completed features). Next: "execute task 2" (env validation, money helpers, API client).

- **2026-10-08** — Read the PDF (17 pages incl. system diagram p.2 and build plan p.16). Generated and committed: PRD.md, Technical_Requirements.md, User_Journey.md, UI_UX_Brief.md, Implementation_Plan.md, security.md, architecture.md, rules.md, agent.md, design.md, memory.md, Tasks.md.
