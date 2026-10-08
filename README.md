# SmartRouter

**Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere.**

SmartRouter is an AI model marketplace. You describe a task; it classifies it, ranks ~40 models from
10 MPP providers by quality, live price and speed, quotes an exact price, runs the model and streams
the result. Every payment — you → SmartRouter and SmartRouter → each provider — runs on Tempo through
**MPP (Machine Payments Protocol)**. No subscriptions, no provider accounts, no API keys, and a free
fallback model so you are never stuck.

Built for the Colosseum hackathon (submission 12 Oct 2026). First beta community: Nigeria.

## How the money moves

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
│ Naira, MPP   │  (coming soon)
│ Credits      │
└──────────────┘
```

1. **Fund** an embedded Tempo wallet with any Tempo token (Apple Pay, card credits, crypto, bridging). Providers are paid in USDC.e, so there is a one-tap swap.
2. **Open an allocation** (default $2): one scoped spend permission (USDC.e only, SmartRouter sessions only), then a session channel with a local voucher signer.
3. **Run**: each request is paid with an off-chain cumulative voucher for the exact quoted price (provider cost + 10%, rounded up to $0.0001). No prompts, no gas — fees are sponsored.
4. **Settle**: SmartRouter settles every $1 or hourly; the receipt shows the session id instantly and the tx hash after settlement. Idle sessions close after 24 h and unused funds return.

## Repository

| Path | What |
|---|---|
| `apps/web` | Next.js 15 frontend (this repo's build). See `apps/web/README.md` |
| `PRD.md`, `Technical_Requirements.md`, `User_Journey.md`, `UI_UX_Brief.md`, `design.md` | Product, contract, journeys and the futuristic UI spec |
| `architecture.md`, `security.md`, `rules.md`, `agent.md` | Frontend architecture, security model, coding rules, agent operating rules |
| `Implementation_Plan.md`, `Tasks.md`, `memory.md` | Phased plan, the 29 executed tasks with commit hashes, and the running decision ledger |
| `Backend_Gaps_Report.md` | Open questions for the API team (REST contract, SDK packages, CSP origins) |

The backend (Hono API, worker, provider adapters, catalog) is specified in the architecture document and
lives outside this repo; the frontend talks to it through a single proposed-endpoint file and runs fully
offline on MSW mocks.

## Run the web app

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
cd apps/web && NEXT_PUBLIC_MOCK=1 pnpm dev      # http://localhost:3000
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm guard:hosts`, `scripts/ci.sh`
(all from `apps/web`). `pnpm test:e2e` walks the PDF demo path on mocks on mobile and desktop;
`pnpm test:e2e:record` records it to `test-results/**/video.webm` (see `apps/web/docs/demo-script.md`).
Feature flags: `NEXT_PUBLIC_FLAG_COMPARE`, `NEXT_PUBLIC_FLAG_MUSIC` (cut order from the plan).
The app ships a web manifest and icons, so it installs as a standalone PWA (no service worker yet).

## Attribution & licences

- **Quality data: LMArena, Artificial Analysis.** LMArena leaderboard data is CC-BY-4.0.
- Models are **available via MPP** gateways (Tempo, Locus). SmartRouter is not partnered with the model companies.
- The free model is **Llama 3.1 8B** on Cloudflare Workers AI, sponsored by SmartRouter (30 messages per user per day).
