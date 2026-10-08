# SmartRouter — 3-minute demo script (PDF path)

Run with `NEXT_PUBLIC_MOCK=1 pnpm dev` (or testnet). Record at 1280×800, dark theme, motion on.
Each beat maps to a Journey in `User_Journey.md` and an effect in `design.md` §7.

| Time | Beat | What to show | What to say |
|---|---|---|---|
| 0:00–0:15 | Landing | Router orb floating, pitch reveals word by word, task chips, "80% of the best quality at 1/34 of the price" ticks up with the teal trail | "Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere." |
| 0:15–0:35 | Deposit | Sign in with passkey (dialog over the page), open the wallet, Deposit → balance splash | "One passkey. Fund with any Tempo token — Apple Pay, card credits or crypto. Providers are paid in USDC.e, so there's a one-tap swap." |
| 0:35–0:55 | Allocation | Approve the scoped spend permission (shield locks), Open allocation → liquid ring fills to $2 | "One approval, scoped to USDC.e and SmartRouter sessions only. That's the whole on-chain setup. Every request after this is an off-chain voucher — no prompts, no gas." |
| 0:55–1:20 | Task + recommendation | Describe a writing task → classification tags, four HoloCards stagger in, drag the slider: cards re-rank, prices tick | "It classifies the task and shows the top two by score, the best-quality model, and the free model — always. Cheapest, balanced, or best quality: the slider means what it says." |
| 1:20–1:50 | Result | Run → particle burst + glow trail to the card and the HUD, tokens stream with the caret, model tag "via MPP", ring drains by $0.0009 | "Run. The browser signs a cumulative voucher for exactly the quoted price. The model streams back through SmartRouter — you never need a provider account." |
| 1:50–2:10 | Switch + Compare | Switch model mid-thread from the pill; toggle Compare, pick two, both stream side by side, pick the winner | "Same thread, different model, like Cursor. Or compare two and pick — that vote trains the ranker." |
| 2:10–2:35 | Top-up | Spend down (or use `[retry]` to show the no-extra-charge retry) until "Allocation used — Top up $2" with Continue free beside it; tap Top up → ring refills | "When the allocation runs out, nothing is charged automatically. Top up with one tap, or keep going on the free model — you're never stuck." |
| 2:35–3:00 | Receipt | Open the receipt: model, price, provider cost, latency, session id; the tx hash decodes after settlement | "Every reply has a receipt. The session id is there instantly; the on-chain hash lands when SmartRouter settles — every dollar or every hour." |

Scenario hooks on mocks: add `[retry]` to a prompt for the retry-on-next-model notice, `[fail]` for the rerun-free path, `[slow]` for a slower stream.
