# SmartRouter — User Journeys

> Every step below maps to a flow stated in `SmartRouter — Build Architecture 2.pdf`. Screen names are ours; behaviours, copy in quotes, limits and amounts are the PDF's.

---

## Personas

| Persona | Need | Where they start |
|---|---|---|
| **Ada, Lagos** (price-sensitive, mobile) | Wants to write and code with good models without $20/month subscriptions | Landing on a phone, pays via crypto transfer or Apple Pay if offered |
| **Sam, occasional user** | Needs a one-off research report with web sources | Landing, picks "Research" |
| **Judge / demo viewer** | Needs to see deposit → allocation → task → recommendation → result → top-up → receipt in 3 minutes | Landing, follows the demo path |

---

## Journey 0 — Landing (unauthenticated)

1. User lands on `/`. Hero states the pitch: *"Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere."*
2. Live proof strip: "10 providers · ~40 models · paid per use on Tempo via MPP". Example saving from the PDF: *"80% of the best quality at 1/34 of the price"* (GLM 5.3 Flash $0.0008 vs Claude Opus 5.5 $0.026, writing task, Oct 7 prices).
3. Task chips: chat · writing · coding · research · translation · image · music.
4. Primary CTA: **Start a task** → opens the composer (works before sign-in; quote requires sign-in).
5. Secondary: **Sign in with passkey**.
6. Footer: "Quality data: LMArena, Artificial Analysis" · "Models available via MPP" (never "partnered with") · Coming soon: Naira (Paystack), MPP Credits.

**Exit:** Journey 1 (sign-in) or Journey 3 (compose first, sign-in when quoting).

---

## Journey 1 — Sign in (passkey, embedded Tempo wallet)

1. Tap **Sign in**.
2. Tempo Accounts SDK (Tempo Wallet adapter) opens the **passkey sign-in dialog over our page**. User never leaves the site.
3. On success the app has the Tempo address. App performs Sign-In with Ethereum: nonce → sign → verify. API sets the httpOnly session cookie.
4. App loads `me`, wallet balance (live from Tempo), current session (if any).
5. First-time user → Journey 2 (fund). Returning user with open allocation → Journey 3.

**Failure paths**
- Passkey cancelled → stay on landing, toast "Sign-in cancelled".
- SIWE verify fails → "Couldn't verify your signature. Try again." Retry button.

---

## Journey 2 — Fund the wallet and open an allocation

### 2a. Deposit (any Tempo-supported token)
1. Wallet sheet shows balance per token (USDC.e, OUSD, pathUSD, USDT0, …) and **Deposit**.
2. Tap Deposit → Tempo deposit dialog (`wallet_deposit`): choose chain, token, amount; Tempo shows Apple Pay, transfer from another wallet, crypto, MACH, bridging (LayerZero, Bungee, Relay) — availability varies by country.
3. Dialog closes → balance refetches, new tokens animate in.

### 2b. Swap to USDC.e (only if needed)
1. If the balance is not USDC.e, the sheet shows **Swap to USDC.e** (one tap) → Tempo swap screen (`wallet_swap`) on Tempo's built-in DEX.
2. On close, USDC.e balance updates.

### 2c. Open the agent allocation (first run)
1. Settings default: allocation **$2**, spending limit e.g. **$10/week**. User may change before confirming.
2. Tap **Open allocation** → one **spend permission** approval dialog (access key limited to USDC.e, scoped to open/top-up with SmartRouter as payee, with expiry). **One passkey tap.**
3. App opens the session channel (`maxDeposit` = allocation) and registers the browser's local voucher signer as `authorizedSigner`.
4. Allocation HUD appears: "$2.00 available". Network fee: none shown (sponsored).

**Failure paths**
- Spend permission rejected → "No allocation yet. You can still chat free." Free model remains available.
- Insufficient USDC.e → show Swap/Deposit CTAs.
- Testnet note: paid models run on mock; copy shows "Testnet".

---

## Journey 3 — New chat → classify → recommend → quote

1. **New chat**: pick a category chip or type a description. A description is classified and quoted as the first prompt.
2. Classification (keyword rules; ambiguous → free model, no cost). Output shown as small tags: task type · short/long · language · needs-web.
3. **Recommendation panel** shows 4 options:
   - Top 2 by score
   - Best-quality model
   - **Free · Llama 3.1 8B**
   Each card: label, **live price**, speed label, one-line reason. Attribution: "Quality data: LMArena, Artificial Analysis".
4. **Slider**: Cheapest ↔ Balanced ↔ Best quality. Moving it re-ranks the cards (weights per PDF).
5. Quote is tied to the exact prompt and valid **5 minutes** (countdown ring visible).
6. User taps a card, or **Auto** (runs top pick), or toggles **Compare** (pick two).

**Edge:** for research tasks, web-search models (Perplexity Sonar) are boosted; the card shows a "searches the web" badge.

---

## Journey 4 — Allocation check

| State | What the user sees |
|---|---|
| Quote ≤ remaining allocation | Run proceeds immediately (Journey 5) |
| Quote > remaining allocation, `auto_free_fallback` on (default) | Chat continues on the free model and says so: "Allocation used — continuing free" |
| Quote > remaining allocation, fallback off | Two buttons side by side: **Top up $2** · **Continue free** |
| Free quota exhausted (30/day) | Free option disabled with reason; Top up offered |

---

## Journey 5 — Run and stream (paid)

1. Browser signs a **cumulative voucher** for the quote; calls `/run`. No prompt, no on-chain tx.
2. Message bubble appears in `streaming` state; tokens stream over SSE; heartbeat every 15 s keeps the connection alive.
3. Text completes → `done`. Reply shows **which model wrote it**, price, latency, and a receipt link (session id now; tx hash after settlement).
4. Allocation HUD decrements by the voucher amount.
5. Thumbs up/down available on the reply.

### Images
- Result arrives as a file URL; shown in a media card with download.

### Music / StableStudio
- `/run` returns a job; the app polls `/api/jobs/:id` until done; progress card shows "Generating… (worker)".

---

## Journey 6 — Run on the free model

1. User picks **Free · Llama 3.1 8B** (or fallback triggers).
2. No voucher; counts toward 30 messages/day. Counter visible: "Free: 12/30 today".
3. History cap 4,000 tokens / reply 512 tokens — long prompts show a hint.
4. If Cloudflare is down, Groq free tier serves the same turn (UI label stays honest to what the API reports).

---

## Journey 7 — Failure and retry

1. Provider error / timeout / price above quote → inline notice "Retrying on {next-ranked model} — no extra charge". Stream restarts.
2. Second failure → "Still failing. **Rerun on free model**" button.
3. No result delivered → the voucher amount is **not counted**; allocation HUD restores.
4. Rate limit (30 req/min) → toast, composer cooldown.
5. Quote expired → auto re-quote, then proceed.

---

## Journey 8 — Continue the chat, switch models

1. Each new turn gets a **fresh quote** for the current model priced on history + prompt.
2. **Switch model** from the composer's model pill → picker lists the 4 recommended options + full catalog; the new model receives the whole thread.
3. If the turn looks like a different task, a **suggestion** chip appears: "This looks like coding — try {model} ({reason})". User decides; never forced.
4. Image/music turn inside a text chat → only the new prompt + a one-line thread summary are sent (shown as an info note).
5. Long chats: history capped at 8,000 tokens; older turns folded into a summary (free model); the chat title is written by the free model and animates in after the first reply.

---

## Journey 9 — Top up

1. "Allocation used — Top up $2" appears in the HUD and in the chat.
2. Tap **Top up** → session top-up call via the existing spend permission (no close). Passkey confirmation only if the SDK requires it.
3. HUD refills with animation. No automatic top-ups — ever.

---

## Journey 10 — Compare mode

1. Toggle **Compare** in the recommendation panel; pick two models.
2. Two vouchers (two quotes) are signed; both run in parallel; two columns stream side by side.
3. User taps **Pick this one** on one column → compare vote recorded; chat continues with that model.
4. Compare is first to be cut if the schedule slips (PDF).

---

## Journey 11 — Receipts and settlement

1. Any reply → **Receipt** drawer: price, provider cost, latency, model, session id, voucher amount, provider receipt.
2. After settlement (every $1 of usage or hourly) the receipt shows the **tx hash** with a link to the Tempo explorer.
3. Sessions idle for 24h are closed by a worker; unused funds return to the wallet; the wallet sheet shows "Returned $x from closed allocation".

---

## Journey 12 — Settings

- Allocation size (default $2) · spending limit (e.g. $10/week) · slider default · auto free fallback (default on).
- Spend permission: status + **Revoke**.
- Wallet: address, balances, Deposit, Swap, explorer link.
- Attribution + licences.

---

## Journey 13 — Coming soon & waitlist

- Top-up screen shows cards: **Naira via Paystack** and **MPP Credits** (T12, mainnet Oct 13). Each opens a small waitlist form: email, country, interest.

---

## Journey 14 — Demo path (3-minute video)

deposit → allocation → task → recommendation → result → top-up → settlement receipt.
Each step above is a Journey section; the frontend must make each visibly distinct and animated so the video reads clearly.
