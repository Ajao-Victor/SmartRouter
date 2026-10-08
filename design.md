# design.md — SmartRouter's futuristic, agentic UI

> This is the hackathon showpiece layer. It sits on the base system in `UI_UX_Brief.md` and must never break the product rules in the PDF (price before run, honest labels, no gas UI, Tempo dialogs on top). Every effect is **capability-gated** (WebGL2 + `hardwareConcurrency ≥ 4`) and **reduced-motion-gated** (fade-only fallback).

**Concept: "The Router."** SmartRouter is a living routing engine. Money and prompts are *light*. The UI shows that light being classified, ranked, routed through MPP to a model, and streamed back. Nothing is a flat card on a grey page.

---

## 1. Visual world

- **Space:** a deep navy-black field (`--bg-0`) with a slow-breathing WebGL **router field**: thousands of points on a curved plane, displaced by simplex noise, with faint "lanes" (lines) that light up when a request is routed.
- **Materials:** glass with chromatic edge (`HoloCard`), hairline borders that shimmer on hover, emissive accents in **router violet** and **Tempo teal**.
- **Light = money.** Teal glows are money (balances, vouchers). Violet glows are intelligence (ranking, routing). Green is the free model. Pink is "used/empty".
- **Type:** Space Grotesk display with occasional **GlitchText** reveals (titles written by the free model, model names); JetBrains Mono tabular numbers that **tick** when prices change.
- **Everything floats:** the composer is a floating dock, the HUD is a floating ring, cards tilt with the pointer.

---

## 2. Effects catalogue (with exact tech)

| Effect | Tech | Where |
|---|---|---|
| **RouterField** | three.js + R3F `Points` (≈ 12k on desktop, 4k mobile), custom GLSL vertex shader: simplex noise displacement + `uActivity` uniform; `LineSegments` lanes with animated dash offset | Fixed backdrop on every page |
| **RouterOrb** | R3F sphere with `MeshTransmissionMaterial` (drei) + inner emissive core; pulses with `streamStore` activity | Logo, landing hero, "thinking" indicator |
| **HoloCard** | Framer Motion `useMotionValue` tilt (±8°), CSS `conic-gradient` border rotating via `@property --angle`, `backdrop-filter` | ModelCard, ReceiptDrawer, wallet balance cards |
| **LiquidRing** | SVG ring + `feTurbulence`/`feDisplacementMap` filter animated with Framer `animate()`; fill level = remaining allocation | AllocationHUD |
| **GlowTrail** | SVG path with `stroke-dasharray` drawn via `pathLength` motion value, from Composer → chosen ModelCard → TopBar | On run: the "routing" beam |
| **ParticleBurst** | Canvas 2D, ≤ 120 particles, one system at a time | Run tap, top-up success, compare pick |
| **GlitchText** | Framer `AnimatePresence` + 3 staggered layers with `clip-path` and hue shift, 600 ms | Chat title reveal, model name on select |
| **NumberTicker** | Framer `useSpring` on a motion value → `useTransform` to formatted micro-USD | PriceTag, balances, latency |
| **FloatingDock** | Framer `layout` + `drag="y"` with constraints; magnetic snap; glass | Composer |
| **MagneticButton** | pointer-tracked `x/y` springs (stiffness 300, damping 20), returns on leave | Run, Top up, Continue free |
| **StreamText caret** | CSS caret + per-chunk `opacity 0→1, y 2→0` (60 ms) batched by rAF | MessageBubble while streaming |
| **CompareSplit wipe** | Framer `clipPath` inset animation between two columns; "Pick" collapses the loser with `scale 0.96 → opacity 0` | Compare mode |
| **Heartbeat pulse** | `motion.div` scale 1→1.03→1 every SSE heartbeat (15 s) on the orb | Streaming connection liveness |
| **TxHashReveal** | Characters decode from random hex to real hash (Framer `animate` on an index motion value) | ReceiptDrawer after settlement |
| **Deposit splash** | Teal ripple (`scale 0→3, opacity 0.6→0`) behind balance when new tokens arrive | WalletSheet |
| **Sheet physics** | Framer `drag="y"`, velocity-based dismiss, rubber-band | WalletSheet (mobile) |

---

## 3. Framer Motion variants library (`lib/motion/variants.ts`)

```ts
export const springs = {
  snappy: { type: 'spring', stiffness: 500, damping: 32, mass: 0.6 },
  soft:   { type: 'spring', stiffness: 170, damping: 26 },
  liquid: { type: 'spring', stiffness: 90,  damping: 18, mass: 1.2 },
  magnet: { type: 'spring', stiffness: 300, damping: 20 },
} as const;

export const fadeUp = {
  hidden:  { opacity: 0, y: 16, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: springs.soft },
  exit:    { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.18 } },
};

export const stagger = (delay = 0.06) => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay, delayChildren: 0.05 } },
});

export const holoCard = {
  rest:     { scale: 1, rotateX: 0, rotateY: 0, boxShadow: '0 0 0 1px var(--line)' },
  hover:    { scale: 1.02, boxShadow: '0 0 0 1px var(--line), 0 0 48px -12px var(--accent)' },
  selected: { scale: 1.03, boxShadow: '0 0 0 1px var(--accent), 0 0 64px -8px var(--accent)', transition: springs.snappy },
  tap:      { scale: 0.98 },
};

export const dock = {
  idle:    { y: 0, boxShadow: '0 0 0 1px var(--line), 0 20px 60px -30px #000' },
  focused: { y: -4, boxShadow: '0 0 0 1px var(--accent), 0 0 80px -20px var(--accent)', transition: springs.soft },
  cooldown:{ x: [0, -4, 4, -2, 2, 0], transition: { duration: 0.4 } },
};

export const hud = {
  ok:        { '--ring': 'var(--accent-2)', scale: 1 },
  low:       { '--ring': 'var(--warn)',     scale: [1, 1.04, 1], transition: { repeat: Infinity, duration: 1.6 } },
  used:      { '--ring': 'var(--signal)',   scale: 1 },
  toppingUp: { '--ring': 'var(--accent)',   rotate: [0, 360], transition: { repeat: Infinity, duration: 1.2, ease: 'linear' } },
};

export const bubble = {
  hidden:    { opacity: 0, y: 12, scale: 0.98 },
  streaming: { opacity: 1, y: 0, scale: 1, transition: springs.soft },
  done:      { opacity: 1, y: 0, scale: 1 },
  error:     { opacity: 1, x: [0, -3, 3, 0], transition: { duration: 0.3 } },
  retrying:  { opacity: [1, 0.6, 1], transition: { repeat: Infinity, duration: 1 } },
};

export const slideUpSheet = {
  hidden:  { y: '100%' },
  visible: { y: 0, transition: springs.liquid },
  exit:    { y: '100%', transition: { duration: 0.25 } },
};

export const reorder = { layout: true, transition: springs.snappy };   // for slider re-rank
```

Reduced motion: `useReducedMotionSafe()` returns `true` → components swap every variant above for `{ hidden: {opacity:0}, visible:{opacity:1}, exit:{opacity:0} }` and disable WebGL.

---

## 4. Component-by-component spec of the agentic effects

### 4.1 Landing (`/`)
- **RouterField** full-bleed; pointer moves a subtle parallax (`uMouse`).
- **Hero**: pitch line with `stagger` word reveal; a **RouterOrb** floats right, slowly rotating; on hover it brightens.
- **SavingProof**: "80% of the best quality at 1/34 of the price" — the `1/34` and prices use **NumberTicker** that counts up on viewport entry. Two **HoloCards**: "GLM 5.3 Flash · $0.0008" vs "Claude Opus 5.5 · $0.026" with a **GlowTrail** beam from the cheaper card to the text.
- **TaskChips**: pill chips with magnetic hover; clicking one fires a **ParticleBurst** and routes to New chat with the category.
- **ComingSoonTeasers**: dashed HoloCards (matching the PDF's dashed boxes) for Naira and MPP Credits, with a soft breathing border.

### 4.2 TopBar
- Logo = mini **RouterOrb** (idle pulse 4 s; fast pulse while streaming; **heartbeat pulse** on each SSE heartbeat).
- Chat title → **GlitchText** when the free model writes it (title arrives after first reply).
- **AllocationHUD** = **LiquidRing**: liquid level = remaining/deposit; `hud` variants ok/low/used/toppingUp. Tapping expands a floating panel with "Top up $2". On top-up success: ring refills with liquid spring + teal **ParticleBurst**.

### 4.3 Composer (`FloatingDock`)
- Glass dock floating 16px above the bottom; `dock.focused` on textarea focus.
- **ModelPill**: shows current model + "via MPP" or "Free · Llama 3.1 8B"; tap → ModelPicker (sheet) with HoloCards.
- **RunButton** (`MagneticButton`): contains a **NumberTicker** price. On tap: `ParticleBurst` + **GlowTrail** draws from the button to the selected ModelCard then up to the HUD (the "routing" moment), ring drains by the voucher amount.
- `dock.cooldown` shake on 429.
- **SuggestionChip** slides in above the dock (`fadeUp`), shimmer border; dismiss swipes it away.

### 4.4 RecommendationPanel
- Appears with `AnimatePresence` + `stagger`; 4 **HoloCards**: top 2 (violet), best quality (blue edge), free (green edge, "Free · Llama 3.1 8B").
- Each card: `QualityPriceSpeedBars` — three thin bars animate width from 0 with `springs.soft`; price `NumberTicker`; reason line types in (per-character, 12 ms).
- **Slider** with three detents; dragging it moves a glowing thumb along a gradient track (teal → violet → blue). On detent change, cards **re-rank with `layout` animation**, prices tick, the new #1 flashes its border.
- **QuoteRing**: 5-minute countdown ring around the Run price; turns `--warn` at 60 s; at 0 it morphs into a "Re-quote" pill.
- **Attribution** fades in last: "Quality data: LMArena, Artificial Analysis".

### 4.5 Thread / MessageBubble
- User bubble: `fadeUp`. Assistant bubble: `bubble.streaming` with caret; model tag chip animates in with the model's colour.
- **StreamText**: tokens arrive in rAF batches; each batch `opacity/y` micro-animate. Code blocks get a scanline shimmer once on completion.
- **RetryNotice**: "Retrying on {model} — no extra charge" slides in with `bubble.retrying` pulse; the previous model tag crossfades to the new one.
- Error: `bubble.error` shake + "Rerun on free model" MagneticButton (green).
- Thumbs: tap scales 1.3→1 with `springs.snappy`; up emits 6 teal particles.
- **ReceiptLink** → ReceiptDrawer (HoloCard) with rows staggering in; **TxHashReveal** decodes when `tx_hash` arrives; session id shown immediately (PDF).

### 4.6 MediaCard / JobCard
- Images: reveal with a radial mask (`clipPath: circle(0%) → circle(150%)`), then a tilt HoloCard.
- JobCard (Suno/StableStudio): a **RouterOrb** mini spins inside a progress capsule with "Generating… (worker)" and dots; on done morphs (`layoutId`) into the MediaCard. Audio gets a canvas waveform bar reacting to playback.

### 4.7 CompareSplit
- Toggle → the thread splits with a **clipPath wipe**; two columns each with its own model tag and caret; both stream.
- "Pick this one" MagneticButton under each; picking collapses the other column (`scale 0.96 → opacity 0`) and fires ParticleBurst in the winner's colour.

### 4.8 WalletSheet
- Mobile bottom sheet with **Sheet physics**; desktop side panel with `fadeUp`.
- Balance cards: HoloCards per token with `NumberTicker`; new deposits trigger **Deposit splash**.
- **SwapButton** (only when balance ≠ USDC.e): arrow icon loops a 360° spin on hover; "Swap to USDC.e".
- **AllocationControls**: allocation $ and weekly limit as drum-roll steppers (Framer `y` stagger of digits).
- **SpendPermissionCard**: shows token / payee / expiry with a shield that "locks" (`rotate 0→-10→0`) on approval; Revoke is a plain danger button (no gamification of destructive actions).
- **ComingSoonCards**: dashed, breathing border; tapping flips (`rotateY 180`) to the WaitlistForm.

### 4.9 TopUpBar
- Appears when quote > remaining: two equal MagneticButtons side by side — **Top up $2** (teal) · **Continue free** (green) — slide in from opposite edges and meet in the middle (`x: -40→0` / `x: 40→0`).
- "Allocation used — Top up $2" headline with a quick `GlitchText` flicker.

### 4.10 Settings
- Toggles with liquid thumbs; slider default with the same gradient track; sections `stagger`.

### 4.11 Testnet banner
- Thin top strip with diagonal animated stripes (`background-position` loop) and "Testnet — paid models run on mock".

---

## 5. Performance budget

| Metric | Budget |
|---|---|
| JS (initial, gz) | ≤ 220 kB landing; WebGL chunk lazy ≤ 180 kB |
| RouterField | ≤ 1 draw call for points + 1 for lanes; 60 fps desktop, 30 fps mobile (DPR capped at 1.5) |
| Particle systems | 1 concurrent, ≤ 120 particles, canvas 2D |
| Blur surfaces | ≤ 3 visible `backdrop-filter` elements at once |
| Fallback | WebGL off → CSS radial gradients with a 20 s hue drift |

Capability gate: `webgl2 && hardwareConcurrency ≥ 4 && !prefers-reduced-motion && !saveData`.

---

## 6. What stays sober (on purpose)

- Price numbers, model labels, "Free · Llama 3.1 8B", attribution and receipts are always legible on solid/glass, never over moving particles.
- Tempo SDK dialogs are never obscured; our WebGL pauses (`frameloop="never"`) while an SDK dialog is open.
- Revoke, logout and "Forget this device" use plain buttons.

---

## 7. Demo-video choreography (3 min, PDF path)

1. **Deposit**: wallet sheet, deposit dialog, Deposit splash.
2. **Allocation**: spend-permission shield lock → LiquidRing fills to $2.
3. **Task**: type a writing task in the FloatingDock; classification tags pop.
4. **Recommendation**: 4 HoloCards stagger in; drag slider → re-rank with layout animation; "80% of the best quality at 1/34 of the price" types in.
5. **Result**: Run → ParticleBurst + GlowTrail → stream with caret; model tag; ring drains.
6. **Top-up**: run until "Allocation used — Top up $2" → tap → ring refills.
7. **Settlement receipt**: open ReceiptDrawer → session id → TxHashReveal decodes.
