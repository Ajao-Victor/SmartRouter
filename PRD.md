# SmartRouter — Product Requirements Document (PRD)

> Source of truth: `SmartRouter — Build Architecture 2.pdf` (Oct 7, 2026, @0xAristos).
> Everything in this document is derived from that file. Where the PDF is silent, the gap is called out explicitly under **Open gaps** rather than filled in.

---

## 1. One-line summary

**SmartRouter is an AI model marketplace.** The user describes a task, SmartRouter recommends the best model for their budget and taste, runs it, and charges per use from an embedded Tempo wallet. Every payment — user → SmartRouter and SmartRouter → each model provider — runs on Tempo through **MPP (Machine Payments Protocol)**.

**Pitch:** *"Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere."*

---

## 2. The problem

- Occasional and price-sensitive AI users do not want several **$20/month subscriptions** to access different frontier models.
- Using the best model for each task today means holding multiple provider accounts and API keys.
- Users in many regions (Nigeria is the first beta community) have limited access to the card/subscription rails those providers assume.
- There is no neutral layer that shows **live price vs. quality** across providers before a user spends money.

## 3. The Web3 solution

SmartRouter replaces subscriptions with **pay-per-use on Tempo**:

| Concern | SmartRouter answer (from PDF) |
|---|---|
| Access to ~40 models from 10 providers | All used inside SmartRouter; no provider accounts or API keys |
| Funding | Embedded Tempo wallet; deposits in **any Tempo-supported token** (Apple Pay, card-bought credits, crypto transfer, bridging) |
| Paying per request | An **agent allocation** = an MPP session deposit (default **$2**). Each request is paid **off-chain** with a signed voucher; **no on-chain tx per request** |
| Getting money back | Unused allocation returns to the wallet when the session closes (idle 24h) |
| Never stuck | A **free fallback model** (Llama 3.1 8B on Cloudflare Workers AI) when the allocation runs out, when the user picks Free, or when a paid model fails twice |
| Network fees | SmartRouter sponsors them via Tempo's fee-payer service — users only spend USDC.e |
| Transparency | Price shown **before each run** = provider cost + SmartRouter fee (10%), rounded up to $0.0001; quote valid 5 minutes |

## 4. Target audience

- **Primary:** occasional and price-sensitive AI users anywhere who don't want multiple subscriptions.
- **First beta community:** Nigeria (deposit paths and Apple Pay availability to be tested from Nigeria on day 1).
- **Device posture:** mobile-first (the PDF specifies a mobile-first Next.js + Tailwind web app, PWA later).

## 5. Launch scope (live by Oct 12)

Everything below is **in** the launch build:

1. **Six task types:** chat, writing, coding, research, image, music (translation also appears as a New-chat category).
2. **10 live MPP providers, ~40 models**, all paid in USDC.e on Tempo:
   OpenAI, Anthropic, OpenRouter (via Tempo); DeepSeek, Mistral AI, Groq, Perplexity, Suno (via Locus); fal.ai (via Tempo); StableStudio (own endpoint).
3. **Chats that keep one thread** while the user switches models (like Cursor). Each reply records which model wrote it.
4. **Free fallback model** — "Free · Llama 3.1 8B" — 30 messages/user/day, text only.
5. **Embedded Tempo wallet:** passkey sign-in, deposits in any Tempo-supported token, balance (read live from Tempo, never stored).
6. **Agent allocation** paid through an MPP session, with a **one-tap top-up** when it runs out ("Allocation used — Top up $2"). No automatic top-ups.
7. **Recommendations** with a **price-vs-quality slider** and **live prices**: top 2 by score + best-quality model + free model (4 options), each with price, speed label and a one-line reason.
8. **Thumbs up/down** on replies and a **side-by-side Compare mode** (runs two models in parallel; the pick feeds the recommendation engine).
9. **Token conversion:** one-tap swap to USDC.e via Tempo's built-in DEX (`wallet_swap`) if the balance is in another token.
10. **"Coming soon" cards** with a waitlist for naira top-ups (Paystack) and MPP Credits.

### Explicitly out of the launch build
- Naira top-ups via Paystack (waitlist only).
- Paying with MPP Credits (needs Tempo's T12 upgrade — mainnet Oct 13 — and merchant approval).
- Gemini, Grok, Stability AI, Replicate, Baseten (later additions).
- Batching swap + session top-up into one Tempo transaction (stretch).
- Provider-level sessions for OpenAI/Anthropic/OpenRouter (later optimisation).

### Cut order if a day slips
Compare mode and music are cut first (PDF build plan).

## 6. Primary features — detailed requirements

### F1. Onboarding & wallet
- Sign in with a **passkey** through the Tempo Accounts SDK + Tempo Wallet adapter. Tempo's sign-in, approval and deposit screens appear as **dialogs over SmartRouter's page**; users never leave the site.
- Backend verifies passkey and plain-wallet signatures (Sign-In with Ethereum) and sets an **httpOnly session cookie**.
- Deposit flow (`wallet_deposit`): choose chain, token, amount; Tempo offers Apple Pay, transfer from another wallet, crypto, MACH and others, varying by region.
- Show wallet balance read from Tempo.

### F2. Agent allocation (MPP session)
1. User sets allocation size in **Settings** (default **$2**) and a spending limit (e.g. **$10/week**).
2. First run: user approves **one spend permission** — an access key limited to USDC.e, scoped to opening and topping up sessions with SmartRouter as payee, with an expiry. One passkey tap.
3. App opens a session channel with SmartRouter (`maxDeposit` = allocation). The browser holds a **local voucher signer** registered as the channel's `authorizedSigner` (TIP-1034), so requests are paid with no prompts.
4. Each request: browser signs a **cumulative voucher** for the quoted price; SmartRouter verifies off-chain, then runs the model.
5. Allocation used up → "Allocation used — Top up $2" even if the main wallet has more. One tap tops up without closing the session.
6. Background job closes sessions idle for 24h; unused funds return.

### F3. New chat & classification
- New chat: pick a category (chat, writing, coding, research, translation, image, music) **or** describe the task.
- A description is classified and quoted as the first prompt so the user can run it immediately.
- Classification output: task type, complexity (short/long), language, needs-web. Keyword rules settle clear prompts; ambiguous prompts go to the free model at no cost.

### F4. Recommendation & quote
- Show **top 2 by score + best-quality model + free model**. Each card: model label, live price, speed label, one-line reason (e.g. "80% of the best quality at 1/34 of the price").
- Slider presets (quality, price, speed): **Cheapest** (0.2, 0.7, 0.1) · **Balanced** (0.45, 0.4, 0.15) · **Best quality** (0.8, 0.1, 0.1).
- Quote = provider's live 402 price + 10% fee, rounded up to $0.0001; valid 5 minutes; tied to the exact prompt.
- Attribution under every recommendation: **"Quality data: LMArena, Artificial Analysis"** (licence requirement).
- "Auto" runs the top pick. Suggest, never force: a mismatched turn gets a suggestion with a reason; the user decides.

### F5. Run & stream
- Browser calls `/run` with the quote and a signed session voucher.
- Text streams over **Server-Sent Events** with a heartbeat every 15 s.
- Images return as files. Suno and StableStudio jobs finish in the worker; the app **polls** them.
- Failure: provider error/timeout/price above quote → retry once on the next-ranked model at no extra charge; still failing → user can rerun on the free model. No result delivered → voucher amount not counted.

### F6. Allocation check & free fallback
- Quote ≤ remaining allocation → continue.
- Otherwise show **Top up** and **Continue free** side by side. With auto free fallback on (default), the chat continues on the free model and says so.
- Free-model turns skip payment and use the free quota (30/day).

### F7. Chats
- One thread per topic; model switching on any turn; new model receives the whole thread.
- Each turn gets a fresh quote for the current model priced on history + new prompt.
- Image/music turns inside a text chat send only the new prompt + a one-line thread summary.
- Long chats: paid models get ≤ 8,000 tokens of history; older turns folded into a running summary written by the free model, which also writes chat titles.

### F8. Feedback & Compare
- Thumbs up/down per reply.
- Compare mode runs two models in parallel, side by side; the user's pick is recorded as a compare vote.

### F9. Receipts & records
- Each request records price, provider cost, latency, session id, voucher amount and provider receipt.
- Session receipts show the **session id per request**; a **tx hash appears after settlement** (settle every $1 of usage or hourly).

### F10. Coming-soon & waitlist
- Cards on the top-up screen for **Naira via Paystack** and **MPP Credits**, each with a waitlist (email, country, interest).

## 7. Success criteria (from the launch checklist)

- Live product with real users by Oct 11; submission Oct 12 (Colosseum).
- 20+ beta users with real usage; quotes collected for the pitch.
- 3-minute demo video: deposit → allocation → task → recommendation → result → top-up → settlement receipt.
- Public repo with README and architecture diagram.

## 8. Non-functional requirements

- Mobile-first, PWA later.
- Honest labelling: "Free · Llama 3.1 8B"; "available via MPP" (never "partnered with").
- Secrets only in host env; no provider or treasury keys in the browser; user access keys are non-extractable browser keys; uploaded files checked for size and type.
- Health check every provider every 5 min; auto-fallback to the next-ranked model; price ceiling 2× the catalog estimate.
- Load-test before inviting more than ~50 beta users (gateways publish no rate limits).

## 9. Open gaps (not specified in the PDF)

| Gap | Impact on frontend | Handling |
|---|---|---|
| Full REST contract for chats, quotes, catalog, settings, feedback, waitlist | Frontend needs typed endpoints beyond `/run` | The PDF defers to a separate "Backend Architecture doc" that was **not provided**. `Technical_Requirements.md` lists a **proposed** contract, clearly marked, to be reconciled with the API team |
| Exact shape of the SSE event payloads | Streaming UI parsing | Proposed event schema in `Technical_Requirements.md`, marked as assumption |
| Which browser library signs session vouchers | Wallet integration | The PDF names Tempo Accounts SDK + Tempo Wallet adapter for auth/deposits and "mppx" on the server; the browser-side voucher signer package is not named. Flagged for confirmation |
| Whether session deposits count against the on-chain spend limit | Copy in Settings | PDF says: confirm on testnet; rely on call scope + SmartRouter caps if not |
| Uploaded file limits (size/type values) | Attachment UI | Only "checked for size and type" is stated; values TBD |
| Per-user cap default ($5/day) vs weekly limit ($10/week example) | Settings UI copy | Both appear in the PDF; surface both, confirm which the API enforces |
