# SmartRouter — UI / UX Brief

> Product facts from `SmartRouter — Build Architecture 2.pdf`. Visual language is ours. The wild, animated layer is specified in `design.md`; this brief sets the base system that layer sits on.

---

## 1. Design principles

1. **Price is the hero.** Every model shows a live price before anything runs. Numbers are large, tabular, and animate when they change.
2. **Never stuck.** The free model is always visible and labelled honestly: **"Free · Llama 3.1 8B"**.
3. **No chain noise.** Users spend USDC.e only; fees are sponsored. We never show gas, chain IDs or hex unless the user opens a receipt.
4. **Mobile-first.** Lagos on a mid-range Android is the primary viewport. One-thumb reach for Run, Top up, Switch model.
5. **Honest labelling.** "Available via MPP", "Quality data: LMArena, Artificial Analysis". Testnet is marked.
6. **Immersive but readable.** Glow and motion live in the background layer; text sits on solid or high-contrast glass.

## 2. Colour palette

Tokens (CSS variables on `:root`, dark by default — the product is dark-first; a light theme is secondary).

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg-0` | `#05060A` | `#F7F8FC` | Page base |
| `--bg-1` | `#0B0E17` | `#FFFFFF` | Panels |
| `--bg-2` | `#121626` | `#EEF1F8` | Raised cards |
| `--glass` | `rgba(18,22,38,0.55)` | `rgba(255,255,255,0.6)` | Glass surfaces (+ backdrop-blur 18px) |
| `--line` | `rgba(255,255,255,0.08)` | `rgba(10,14,30,0.08)` | Hairlines |
| `--text-0` | `#F2F4FF` | `#0A0E1E` | Primary text |
| `--text-1` | `#A7ADC6` | `#4B5270` | Secondary |
| `--text-2` | `#6B7190` | `#8A90AD` | Muted |
| `--accent` | `#7C5CFF` | `#5B3DF5` | Router violet — primary actions |
| `--accent-2` | `#19E6C1` | `#0FB89A` | Tempo teal — money, balances, success |
| `--signal` | `#FF5C8A` | `#E0356A` | Errors, "allocation used" |
| `--warn` | `#FFB547` | `#D98A12` | Quote expiring, low allocation |
| `--free` | `#9BE15D` | `#5FA322` | Free model identity |
| `--quality` | `#5CC8FF` | `#1E8FD6` | Quality dimension |
| `--price` | `#19E6C1` | `#0FB89A` | Price dimension (same as accent-2) |
| `--speed` | `#FFD166` | `#D9A400` | Speed dimension |

Gradient primitives:
- **Router beam:** `linear-gradient(120deg, #7C5CFF 0%, #19E6C1 100%)`
- **Hot glow:** radial `#7C5CFF40 → transparent` for focus halos.
- **Free glow:** radial `#9BE15D33`.

Contrast rule: body text ≥ 4.5:1 against the surface it sits on; accent text used only at ≥ 18px or bold.

## 3. Typography

| Role | Font (`next/font`) | Size / weight |
|---|---|---|
| Display / hero | **Space Grotesk** | 40–72px, 600, tracking -0.02em |
| UI / body | **Inter** | 14–16px, 400/500 |
| Numbers (prices, balances, latency) | **JetBrains Mono** with `font-variant-numeric: tabular-nums` | 12–28px, 500 |
| Code in replies | JetBrains Mono | 13px |

Scale (rem): 0.75 · 0.875 · 1 · 1.125 · 1.25 · 1.5 · 2 · 2.5 · 3 · 4.5.
Line-height: 1.5 body, 1.1 display. Max line length 68ch in chat.

## 4. Spacing, radius, elevation

- Spacing scale: 4px base (`1`=4, `2`=8, `3`=12, `4`=16, `6`=24, `8`=32, `12`=48, `16`=64).
- Radius: `sm` 8px · `md` 14px · `lg` 20px · `pill` 999px. Cards use `lg`; chips use `pill`.
- Elevation is **glow + hairline**, not drop shadow: `0 0 0 1px var(--line), 0 0 40px -10px var(--accent)` on focus/hover.
- Backdrop blur only on overlays and floating HUDs (performance on mobile).

## 5. Visual hierarchy (per screen)

### Landing
1. Hero pitch line (display) → 2. live saving proof (mono numbers) → 3. task chips → 4. CTA pair.

### Chat workspace (primary screen)
```
┌───────────────────────────────────────────────┐
│ TopBar: logo · chat title · Allocation HUD    │  ← HUD = remaining $ ring + Top up
├───────────────────────────────────────────────┤
│ Thread (messages, model tag per reply)        │
│                                               │
│  ┌ Recommendation panel (4 cards + slider) ┐  │  ← appears above composer when a quote exists
│  └─────────────────────────────────────────┘  │
├───────────────────────────────────────────────┤
│ Composer: textarea · attach · model pill ·    │
│           Compare toggle · Run (price inside) │
└───────────────────────────────────────────────┘
```
Order of attention: **Run button with live price** → recommendation cards → thread → HUD.

### Wallet sheet (bottom sheet on mobile, side panel on desktop)
Balance per token → Deposit → Swap to USDC.e (conditional) → Allocation controls → Coming-soon cards (Naira, MPP Credits).

### Receipt drawer
Model · price · provider cost · latency · session id · voucher amount · provider receipt · tx hash (after settlement).

## 6. Core components (base system)

| Component | Notes |
|---|---|
| `Button` | variants: primary (router beam), secondary (glass), ghost, danger, free (green); sizes sm/md/lg; loading state with inline spinner |
| `PriceTag` | mono, tabular, rounds **up** to $0.0001; colour `--price`; animates digit changes |
| `ModelCard` | label, provider "via MPP", price, speed label, reason line, quality bar; selectable; `best`/`cheapest`/`free` badges |
| `Slider` | three detents: Cheapest / Balanced / Best quality; shows weights (q/p/s) on hover |
| `AllocationHUD` | ring showing remaining/deposit; states: ok, low (< 25%), used (0), topping-up |
| `MessageBubble` | role, model tag, status (streaming/done/error/retrying), thumbs |
| `StreamText` | token-by-token renderer |
| `MediaCard` | image/audio result with download |
| `JobCard` | async progress for Suno/StableStudio |
| `QuoteRing` | 5-minute validity countdown |
| `Sheet` / `Dialog` / `Drawer` | focus-trapped; z-index below Tempo SDK dialogs |
| `Toast` | top-centre on mobile, bottom-right on desktop |
| `ComingSoonCard` | Naira · MPP Credits; opens waitlist form |
| `Attribution` | "Quality data: LMArena, Artificial Analysis" |

## 7. Interaction paradigms

- **Tap-to-run, never confirm twice.** After the one-time spend permission, a run is a single tap (vouchers are prompt-free).
- **Side-by-side choices** for money moments: `Top up $2` | `Continue free` are equal-weight buttons, never a modal with a buried secondary.
- **Live re-ranking.** Dragging the slider re-sorts cards with layout animation; prices tick.
- **Model switching is in the composer**, not a settings page. The pill shows the current model; tapping opens the picker.
- **Suggest, never force.** Suggestions are dismissible chips above the composer.
- **Streaming feel.** Cursor caret while streaming; heartbeat keeps a subtle pulse so users know the connection is alive.
- **Receipts are one tap away** from any reply.
- **Status is honest**: Testnet banner when on testnet; "Free · Llama 3.1 8B" label; "Retrying on X — no extra charge".

## 8. Copy guidelines (verbatim where the PDF sets it)

- "Allocation used — Top up $2"
- "Continue free"
- "Free · Llama 3.1 8B"
- "80% of the best quality at 1/34 of the price" (pattern: *{pct}% of the best quality at 1/{n} of the price*)
- "Quality data: LMArena, Artificial Analysis"
- "Available via MPP" (never "partnered with")
- "Coming soon: Naira via Paystack" · "Coming soon: MPP Credits"

## 9. Responsive breakpoints

| Name | Width | Layout |
|---|---|---|
| `sm` | < 640 | Single column; wallet as bottom sheet; recommendation cards horizontal scroll-snap |
| `md` | 640–1024 | Single column, wider composer; cards 2×2 |
| `lg` | ≥ 1024 | Thread + right rail (recommendations/receipts); wallet side panel; Compare in two columns |

## 10. Accessibility

- Every animated element honours `prefers-reduced-motion` (fallback: fade only).
- Keyboard: `Cmd/Ctrl+Enter` runs; `Esc` closes sheets; arrow keys move the slider between detents.
- ARIA live region announces "Streaming…", "Done — {model}", "Allocation used".
- Hit targets ≥ 44px on mobile.
