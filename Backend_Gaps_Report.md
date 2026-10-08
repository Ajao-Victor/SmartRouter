# SmartRouter — Backend Gaps Report

**Prepared for:** Backend engineer (Hono API / worker / Tempo integration)
**Prepared by:** Frontend (apps/web)
**Date:** 8 October 2026
**Source reviewed:** *SmartRouter — Build Architecture 2.pdf* (7 Oct 2026, @0xAristos), 17 pages
**Purpose:** The frontend build starts today. The architecture document fully specifies the money flow, request lifecycle and data model, but defers several integration details to the separate *Backend Architecture doc*, which the frontend team has not received. This report lists every open item as a concrete question, states the assumption the frontend is building on in the meantime, and marks priority so you can answer the blocking ones first.

**Priority key:** 🔴 Blocking (needed before Phase 3 integration, ~9 Oct) · 🟠 Important (needed before mainnet promotion) · 🟢 Nice to have

---

## Summary of requests

| # | Area | Priority | Fastest way to answer |
|---|---|---|---|
| 1 | REST contract beyond `/run` | 🔴 | Share the Backend Architecture doc or an OpenAPI/TypeScript route listing |
| 2 | `/run` request and SSE event schema | 🔴 | Paste the Hono route handler types |
| 3 | Browser session + voucher signing client | 🔴 | Package name + a 10-line example of open / sign / top-up |
| 4 | Shared types package | 🔴 | Package name and export path in the monorepo |
| 5 | Testnet API URL and mock behaviour | 🔴 | URL + confirmation that endpoints match mainnet |
| 6 | Authentication details (SIWE, cookie, CSRF) | 🟠 | Message format, cookie attributes, CSRF expectation |
| 7 | Upload limits | 🟠 | Max bytes and MIME allowlist |
| 8 | Tempo SDK dialog rendering (CSP) | 🟠 | Does it iframe? Which origins? |
| 9 | Caps and limits exposed to the UI | 🟠 | Which values the API returns vs. enforces silently |
| 10 | Settlement, receipts and explorer | 🟢 | Explorer base URL per network; when `tx_hash` appears |
| 11 | Session lifecycle edge cases | 🟢 | Idle-close notification; reopen flow |

---

## 1. REST contract beyond `/run` 🔴

**What the PDF confirms:** `POST /run` (also written `/api/run`) with `mppx/hono` session middleware; text streams over SSE with a 15 s heartbeat; images return as files; Suno and StableStudio jobs are polled. Everything else (chats, quotes, catalog, settings, feedback, waitlist, sessions, receipts) exists as database tables but has no documented route.

**What the frontend has assumed** (all isolated in one file, `lib/api/endpoints.ts`, so they can be replaced in one edit):

| Proposed route | Method | Purpose | Derived from PDF table |
|---|---|---|---|
| `/api/auth/nonce` | GET | SIWE nonce | "Sign-In with Ethereum … httpOnly session cookie" |
| `/api/auth/verify` | POST | Verify signature, set cookie | same |
| `/api/auth/logout` | POST | Clear cookie | — |
| `/api/me` | GET | Current user | `users` |
| `/api/me/settings` | PATCH | slider, allocation, weekly_limit, auto_free_fallback | `users` |
| `/api/models` | GET | Active, verified catalog | `models` |
| `/api/chats` | GET / POST | List / create (category or first prompt) | `chats` |
| `/api/chats/:id` | GET / PATCH | Chat + messages / switch `current_model_id` | `chats`, `messages` |
| `/api/chats/:id/quote` | POST | Classify + rank + quote | `quotes`, request lifecycle steps 2–5 |
| `/api/sessions` | POST | Register channel + `authorized_signer` | `user_sessions` |
| `/api/sessions/current` | GET | Allocation status | `user_sessions` |
| `/api/jobs/:id` | GET | Poll async job | lifecycle step 9 |
| `/api/requests/:id` | GET | Receipt incl. `tx_hash` after settlement | `requests`, `treasury_moves` |
| `/api/feedback` | POST | Thumbs | `feedback` |
| `/api/compare-votes` | POST | Compare pick | `compare_votes` |
| `/api/free/usage` | GET | Messages used today of 30 | `free_usage` |
| `/api/waitlist` | POST | email, country, interest | `waitlist` |

**Questions**
1.1 Can you share the Backend Architecture doc, or the route list from the Hono app?
1.2 For each proposed route above: does it exist, and under what path, method and body?
1.3 Is the quote step one call (classify + rank + quote together) or separate calls?
1.4 Does the quote response include all four options (top 2 by score, best quality, free) with `price`, `speed_label`, and the `reason` string, so the UI shows your text verbatim?
1.5 How is the slider passed: a preset name (`cheapest | balanced | best`) or the three weights?
1.6 Where do a chat's `title` and `summary` arrive: in the chat GET, or pushed over the stream?

---

## 2. `/run` request body and SSE event schema 🔴

**Assumed request body:** `{ quote_id, voucher: { channel_id, cumulative_amount, signature }, chat_id }`; free turns omit `voucher`.

**Assumed events** (Zod-validated on the client):

```
event: meta        data: { request_id, model_id, quote_id, session_id }
event: token       data: { text }
event: heartbeat   data: {}
event: retry       data: { from_model_id, to_model_id, reason }
event: file        data: { url, mime }
event: job         data: { job_id }
event: done        data: { request_id, price, provider_cost, latency_ms, voucher_amount }
event: error       data: { code, message, can_rerun_free }
```

**Questions**
2.1 What is the exact request body for `/run`, including how the signed voucher is encoded?
2.2 What event names and payloads does the stream emit? In particular: how is the "retry once on the next-ranked model at no extra charge" signalled, and how does the client learn that a request delivered no result (so the voucher amount is not counted)?
2.3 Do image results come inline as a `file` event or as a job to poll?
2.4 Is `/run` expected to be called with `fetch` + `ReadableStream` (POST with body and cookie), or do you expect `EventSource`?
2.5 What HTTP status and body are returned when the quote exceeds the remaining allocation, when the quote has expired (5 min), and when the user is rate-limited (30 req/min)? Is `Retry-After` set?

---

## 3. Browser session and voucher signing 🔴

**What the PDF confirms:** the Tempo Accounts SDK with the Tempo Wallet adapter handles sign-in, approvals and deposits; the browser holds a local voucher signer registered as the channel's `authorizedSigner` (TIP-1034); each request signs a cumulative voucher; `mppx` runs on the server.

**Questions**
3.1 Which npm package and API does the browser use to (a) open a session channel with `maxDeposit`, (b) register the `authorizedSigner`, (c) sign a cumulative voucher, (d) call top-up without closing? A short code example would unblock the frontend immediately.
3.2 What is the voucher's signed payload format (fields, encoding, hashing) so the client signature verifies on your side?
3.3 How should the voucher signer key be generated and stored? The frontend plans a WebCrypto non-extractable key in IndexedDB. Is a specific curve required?
3.4 For the spend permission: what exact scope parameters do you expect (USDC.e token address, payee address, allowed calls, expiry)? What expiry do you recommend? The frontend currently assumes 30 days.
3.5 After the channel opens on-chain, does the frontend register it with the API (`POST /api/sessions`), or does the API detect it?
3.6 Does the SDK require a passkey tap on top-up, or does the spend permission make it prompt-free?

---

## 4. Shared types package 🔴

**What the PDF confirms:** the web app imports shared types from the API.

**Questions**
4.1 What is the package name (e.g. `@smartrouter/shared`) and import path?
4.2 Does it export Zod schemas as well as TypeScript types?
4.3 Are money fields typed as integer micro-USD numbers, strings, or bigints in the DTOs?

---

## 5. Testnet API URL and mock behaviour 🔴

**What the PDF confirms:** Heroku pipeline `smartrouter-testnet → smartrouter-mainnet`; paid models run on the `mock` adapter on testnet because MPP providers are mainnet-only.

**Questions**
5.1 What are the testnet and mainnet API base URLs?
5.2 Does the testnet API expose the same routes and the same SSE events as mainnet, with mocked content?
5.3 Does the mock adapter simulate failures (retry path, price above quote, timeout) so the frontend can test them?
5.4 Which Tempo network config (chain id, USDC.e address, SmartRouter payee address) should the frontend use on testnet and on mainnet?

---

## 6. Authentication details 🟠

**Questions**
6.1 Exact SIWE message fields (domain, URI, chain id, statement) you verify.
6.2 Cookie attributes: name, `SameSite`, `Secure`, lifetime, and whether the API and web app share an origin or need CORS with credentials.
6.3 CSRF protection: do you check a custom header (the frontend sends `X-Requested-With: smartrouter`), the `Origin` header, or a token?
6.4 How does the API signal an expired session (401 body shape)?

---

## 7. Upload limits 🟠

**What the PDF confirms:** uploaded files are checked for size and type.

**Questions**
7.1 Maximum file size in bytes? (Frontend placeholder: 10 MB.)
7.2 Allowed MIME types? (Frontend placeholder: png, jpeg, webp, plain text, pdf.)
7.3 How are attachments sent: multipart on the quote call, a separate upload endpoint returning a reference, or base64 inline?

---

## 8. Tempo SDK dialog rendering and CSP 🟠

**Questions**
8.1 Do the Tempo sign-in, approval, deposit and swap screens render in an iframe or a popup? If iframe, which origins must be allowed in `frame-src`?
8.2 Which origins does the SDK call so the frontend can set `connect-src` (RPC, API, fee-payer)?
8.3 Does the SDK expose open/close events for its dialogs? The frontend pauses its WebGL layer while a dialog is open.

---

## 9. Caps and limits exposed to the UI 🟠

The PDF defines: allocation default $2; spending limit example $10/week; per-user cap $5/day; free model 30 messages/day; rate limit 30 req/min; history cap 8,000 tokens.

**Questions**
9.1 Which of these does the API return on `/api/me` so the UI can display them, versus enforce silently?
9.2 Settings page: should the user edit a weekly limit, a daily cap, or both?
9.3 Does the free-usage counter come from `/api/me` or a separate call?
9.4 When the free tier is exhausted (30/day) or the global $3/day cap is hit, what error code does the UI receive?

---

## 10. Settlement, receipts and explorer 🟢

**Questions**
10.1 Which fields does the receipt return before settlement (session id, voucher amount, provider receipt) and after (`tx_hash`)?
10.2 Recommended polling interval for receipts awaiting a tx hash? (Frontend plans 20 s for up to 2 h.)
10.3 Tempo block explorer base URL per network for tx-hash links.

---

## 11. Session lifecycle edge cases 🟢

**Questions**
11.1 When the worker closes a session idle for 24 h, how does the frontend learn the amount returned to the wallet?
11.2 After a close, is reopening the same as the first-run flow (spend permission already granted, so just open a channel)?
11.3 If the spend permission expires or is revoked while a session is open, what does the API return on top-up?

---

## What the frontend is doing while waiting

- Building every screen on a mock API that implements the proposed contract above.
- Coding the session client against an interface with a mock implementation so the real package drops in.
- Keeping all PDF-defined numbers and copy verbatim.
- Logging each assumption in `memory.md` in the repo.

Answers can be sent as short replies against the question numbers; a pasted route file or type file is enough for sections 1, 2 and 4.
