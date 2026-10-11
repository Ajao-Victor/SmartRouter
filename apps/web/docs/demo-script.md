# SmartRouter — 3-minute demo script (PDF path)

Run with `pnpm dev` on the testnet API, or `NEXT_PUBLIC_MOCK=1 pnpm dev` for a deterministic take.
Record at 1280×800, dark theme.

| Time | Beat | What to show | What to say |
|---|---|---|---|
| 0:00–0:15 | Landing | Router orb, pitch reveals word by word, task chips, "80% of the best quality at 1/34 of the price" | "Tell SmartRouter what you want done. It picks the best AI for your budget, and you pay per use from your Tempo wallet, from anywhere." |
| 0:15–0:30 | Sign in | *Sign in with passkey* → one platform prompt → `/chat` | "One passkey. No email, no password, no API keys. Your Tempo account is your login and your wallet." |
| 0:30–0:55 | Describe + options | Type a writing task → *Get options* → four plain rows: two recommended, best quality, free — each with its live price, speed and reason | "It classifies the task and quotes the top two by score, the best-quality model, and the free model — always. The price is fixed before anything runs." |
| 0:55–1:25 | First run | Tap the recommended row → the first paid run deposits $2 with one approval → the answer streams in plain text; the meta line shows the model, the charge and latency | "Run. The first paid answer opens a $2 session — one approval. After that every answer is a signed voucher: no prompts, no gas, exactly the quoted price." |
| 1:25–1:50 | Second turn | Type a follow-up; the Send button reads "Send · $0.0009"; press Enter; the wallet pill drains | "Same thread, next turn. The price is on the Send button every time, and the pill in the corner is what's left of the deposit." |
| 1:50–2:10 | Switch + Compare | Open the model menu from the composer: recommended for this message, then the whole catalogue; toggle Compare, tick two, send, pick the winner | "Switch models mid-thread. Or compare two and pick — that vote trains the ranker." |
| 2:10–2:35 | Allocation used | Spend down (or lower the allocation in Settings) until "Allocation used — Top up $2" with *Continue free* beside it; tap Top up | "When the deposit runs out nothing is charged automatically. Top up with one tap, or keep going on the free model — you're never stuck." |
| 2:35–3:00 | Receipt + wallet | Open a receipt: model, charge, latency, status; open the wallet: deposit, spent, remaining, *Close and withdraw*; Activity lists every run | "Every answer has a receipt. Close the session whenever you like and the unspent deposit comes straight back." |

Scenario hooks on mocks: add `[fallback]` to a prompt for the no-extra-charge fallback notice, `[fail]`
for the refund + rerun-free path, `[pending]` for a slow job that polls, `[slow]` for a slower stream.

## Rehearsal and recording

- `pnpm test:e2e` walks the path above on mocks (mobile + desktop projects, `tests/e2e/demo.spec.ts`).
- `pnpm test:e2e:record` records the desktop walk-through at 1280×800 to
  `test-results/**/video.webm` (gitignored). Use it as the timing reference for the voice-over.
- The browser mock starts signed out with no payment session, so the sign-in and first-deposit beats
  are real; a page reload resets the mock state, so do not reload mid-take.
