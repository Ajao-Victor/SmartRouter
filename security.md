# SmartRouter — Frontend Security

> Backend controls are the PDF's; this document covers what the **frontend** must do, and what it must never do, to keep the system's threat model intact.

---

## 1. Threat model (from the PDF)

Three limits protect users — the **allocation**, the **spend permission**, and SmartRouter's own caps — and an on-chain daily limit protects SmartRouter's hot wallet.

| Asset | Where it lives | Frontend responsibility |
|---|---|---|
| User's Tempo wallet root | Tempo Accounts SDK / passkey | Never request more than the scoped spend permission |
| Spend permission (access key) | Non-extractable browser key | Limited to USDC.e; scoped to session open/top-up with SmartRouter as payee; has expiry; user can revoke |
| Voucher signer | Local browser key registered as `authorizedSigner` (TIP-1034) | Can only sign vouchers for that one channel, up to its deposit |
| Session cookie | httpOnly, set by API | Never readable by JS; always `credentials: 'include'` |
| Treasury / hot-wallet / provider keys | Server only | **Never in the browser, never in frontend env** |

## 2. Wallet connection safety

1. **Only the Tempo Accounts SDK with the Tempo Wallet adapter** initiates sign-in, deposit, swap and approvals. No raw `window.ethereum` prompts, no custom signing UIs for these flows.
2. The SDK dialogs render **over our page**; our overlays must never cover or spoof them (z-index contract in `architecture.md`). We never draw a fake passkey/approval UI.
3. **Spend permission scope is hard-coded** from env: token = USDC.e address, payee = SmartRouter, calls = session open + top-up, expiry set. The UI shows the user exactly these three facts before the single passkey tap.
4. **Revoke** is one tap in Settings and is never hidden.
5. **No automatic top-ups.** Top-up requires an explicit user tap (PDF). The frontend has no timer, effect or retry loop that calls top-up.
6. Allocation and spending limit are **user-set** (default $2 / e.g. $10/week); the UI validates them as positive integers in micro-USD before sending.

## 3. Voucher signing

- The voucher private key is generated with WebCrypto as **non-extractable** and persisted in IndexedDB (not localStorage) keyed by channel id.
- Vouchers are **cumulative**; the frontend tracks the running total and refuses to sign above the channel deposit.
- The amount signed equals the **server quote** — the frontend never computes a price to sign from its own numbers.
- A voucher is signed only after the user action that triggers `/run`; never pre-signed or batched.
- If a run returns no result, the UI restores the displayed allocation (PDF: amount not counted) but **does not** roll back the cumulative counter until the server confirms.

## 4. RPC and endpoint protection

- The browser talks to exactly two network parties: **the SmartRouter API** (`NEXT_PUBLIC_API_URL`) and **Tempo via the SDK**. It never calls MPP provider endpoints (`*.mpp.tempo.xyz`, `*.mpp.paywithlocus.com`, `stablestudio.dev`), and no provider host appears in frontend code.
- Allowed origins are enumerated in `next.config` (`images.remotePatterns` for object storage; CSP `connect-src` for API + Tempo + Sentry).
- Content Security Policy (production):
  - `default-src 'self'`
  - `script-src 'self' 'wasm-unsafe-eval'` (three.js) + nonce for Next inline
  - `connect-src 'self' <API> <Tempo endpoints> <Sentry>`
  - `img-src 'self' data: blob: <object storage>`
  - `media-src <object storage>`
  - `frame-src <Tempo SDK dialog origin>` (if the SDK uses iframes — confirm)
  - `frame-ancestors 'none'`
- Any RPC URL for Tempo comes from the SDK/network config, selected by `NEXT_PUBLIC_TEMPO_NETWORK`; the frontend never accepts an RPC URL from query params or user input.
- Explorer links are built from a fixed base per network, with the tx hash validated as `^0x[0-9a-fA-F]{64}$` before linking.

## 5. Authentication

- SIWE message is built client-side with domain, nonce from the API, chain and address; the user signs with passkey or plain wallet; the API verifies and sets the **httpOnly** cookie.
- No JWT or address stored in localStorage; the UI derives auth state from `/api/me`.
- CSRF: cookie is `SameSite=Lax`+`Secure`; mutating requests also send `X-Requested-With: smartrouter` so the API can reject cross-site form posts (confirm with API).
- Logout clears client caches (TanStack Query `clear()`, Zustand reset) and the voucher signer reference in memory; the IndexedDB key is deleted on explicit "Forget this device".

## 6. Data sanitization

| Input | Rule |
|---|---|
| Prompts | Sent as plain text; never interpolated into HTML. Rendered with a markdown renderer that **escapes raw HTML** and disallows `javascript:` URLs |
| Model replies | Treated as untrusted. Markdown rendered with sanitised schema; code blocks are text-only; links open with `rel="noopener noreferrer"` |
| Attachments | PDF: checked for size and type. Frontend enforces an allowlist (`image/png`, `image/jpeg`, `image/webp`, `text/plain`, `application/pdf`) and a max size (value **TBD** — gap) before upload; filenames are never rendered as HTML |
| Chat titles / summaries | Written by the free model (PDF) → untrusted; rendered as text |
| Waitlist | Email validated with Zod; country from an allowlist |
| Query params / deep links | Chat ids validated as UUIDs; unknown params ignored |
| Tx hashes / addresses | Regex-validated before display or linking |

## 7. Prompt-injection posture

The PDF's payee allowlist stops injected content from redirecting payments server-side. The frontend adds:
- Model output can never trigger a run, a top-up, a swap or a deposit. All money actions require a user gesture (click/tap) in our own components.
- "Suggestion" chips come only from the API's `suggestion` field, never from reply text.

## 8. Secrets and build

- `NEXT_PUBLIC_*` vars are public by definition — only addresses, URLs and DSNs go there.
- `.env*` files are gitignored; `.env.example` lists keys without values.
- Sentry is configured with `sendDefaultPii: false`; prompts and addresses are scrubbed from breadcrumbs.

## 9. Rate limits and abuse (client side)

- Mirror the PDF's **30 requests/min per user**: the composer disables Run for the cooldown returned by a 429.
- Free model: show and enforce **30 messages/day** in the UI; the server remains authoritative.
- Debounce quote requests on slider changes (≥ 300 ms) to avoid hammering the 402 reads.

## 10. Testnet vs mainnet

- `NEXT_PUBLIC_TEMPO_NETWORK` drives a visible **Testnet** banner; paid models run on the mock adapter there (PDF). Mainnet build is the promoted, tested build with switched config (PDF).

## 11. Checklist before mainnet

- [ ] No provider hostnames in the bundle (`grep -r "mpp\." .next` empty)
- [ ] CSP active and verified in browser console
- [ ] Spend permission shows token / payee / expiry before approval
- [ ] Revoke works
- [ ] No auto top-up code path
- [ ] Voucher key non-extractable; IndexedDB only
- [ ] Markdown sanitiser tested with script/iframe payloads
- [ ] Attachment allowlist enforced
- [ ] Sentry PII scrubbing verified
