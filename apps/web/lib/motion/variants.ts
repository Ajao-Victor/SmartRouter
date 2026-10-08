import type { Variants } from 'motion/react';

import { exits, springs } from '@/lib/motion/springs';

/**
 * Framer Motion variants library (design.md §3).
 * Rules (rules.md §7): all variants live here; components never inline more than three keys.
 * Every variant set has an opacity-only twin produced by `withReduced()`.
 */

/* ------------------------------- entrances ------------------------------- */

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: springs.soft },
  exit: { opacity: 0, transition: exits.fast },
} satisfies Variants;

export const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: springs.soft },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)', transition: exits.fast },
} satisfies Variants;

export const fadeScale = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: springs.snappy },
  exit: { opacity: 0, scale: 0.98, transition: exits.fast },
} satisfies Variants;

export const blurIn = {
  hidden: { opacity: 0, filter: 'blur(14px)', scale: 1.02 },
  visible: { opacity: 1, filter: 'blur(0px)', scale: 1, transition: springs.glide },
  exit: { opacity: 0, filter: 'blur(8px)', transition: exits.base },
} satisfies Variants;

/** Word-by-word / item-by-item reveal with blur lift. */
export const revealItem = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: springs.soft },
} satisfies Variants;

/* -------------------------------- staggers ------------------------------- */

export interface StaggerOptions {
  /** Delay between children (s). Default 0.06. */
  each?: number;
  /** Delay before the first child (s). Default 0.05. */
  delay?: number;
  /** 1 = first→last, -1 = last→first. */
  direction?: 1 | -1;
}

/** Container that staggers its children's `hidden → visible` and reverses on exit. */
export function stagger(options: StaggerOptions = {}): Variants {
  const { each = 0.06, delay = 0.05, direction = 1 } = options;
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: each, delayChildren: delay, staggerDirection: direction },
    },
    exit: { transition: { staggerChildren: each / 2, staggerDirection: -direction } },
  };
}

/** Faster stagger for word reveals in display copy. */
export const staggerWords = stagger({ each: 0.04, delay: 0.1 });

/* ------------------------------- surfaces -------------------------------- */

/** HoloCard: rest / hover / selected / tap. Tilt is driven by `useTilt`, not variants. */
export const holoCard = {
  rest: {
    scale: 1,
    boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 0 0px 0px rgba(124,92,255,0)',
    transition: springs.soft,
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 0 48px -12px rgba(124,92,255,0.9)',
    transition: springs.magnet,
  },
  selected: {
    scale: 1.03,
    boxShadow: '0 0 0 1px rgba(124,92,255,1), 0 0 64px -8px rgba(124,92,255,1)',
    transition: springs.snappy,
  },
  tap: { scale: 0.98, transition: springs.snappy },
} satisfies Variants;

/** Teal (money) and green (free) twins of the selected glow. */
export const holoCardTeal = {
  ...holoCard,
  selected: {
    scale: 1.03,
    boxShadow: '0 0 0 1px rgba(25,230,193,1), 0 0 64px -8px rgba(25,230,193,1)',
    transition: springs.snappy,
  },
} satisfies Variants;

export const holoCardFree = {
  ...holoCard,
  selected: {
    scale: 1.03,
    boxShadow: '0 0 0 1px rgba(155,225,93,1), 0 0 64px -8px rgba(155,225,93,1)',
    transition: springs.snappy,
  },
} satisfies Variants;

/** Floating composer dock. */
export const dock = {
  idle: { y: 0, scale: 1, transition: springs.soft },
  focused: { y: -4, scale: 1.005, transition: springs.soft },
  /** 429 / disabled run: a short shake. */
  cooldown: { x: [0, -4, 4, -2, 2, 0], transition: { duration: 0.4 } },
} satisfies Variants;

/** Allocation HUD ring. Colour comes from `data-state` CSS; motion from here. */
export const hud = {
  ok: { scale: 1, rotate: 0, transition: springs.soft },
  low: {
    scale: [1, 1.04, 1],
    rotate: 0,
    transition: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' },
  },
  used: { scale: 1, rotate: 0, transition: springs.snappy },
  toppingUp: {
    scale: 1,
    rotate: 360,
    transition: { repeat: Infinity, duration: 1.2, ease: 'linear' },
  },
} satisfies Variants;

/* ------------------------------- messages -------------------------------- */

/** MessageBubble by status (streamStore.status). */
export const bubble = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  streaming: { opacity: 1, y: 0, scale: 1, transition: springs.soft },
  done: { opacity: 1, y: 0, scale: 1, transition: springs.snappy },
  error: { opacity: 1, y: 0, scale: 1, x: [0, -3, 3, 0], transition: { duration: 0.3 } },
  retrying: {
    opacity: [1, 0.6, 1],
    y: 0,
    scale: 1,
    transition: { repeat: Infinity, duration: 1, ease: 'easeInOut' },
  },
} satisfies Variants;

/** Per-token batch micro-entrance inside StreamText. */
export const tokenBatch = {
  hidden: { opacity: 0, y: 2 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.06 } },
} satisfies Variants;

/* --------------------------- sheets / dialogs ---------------------------- */

export const slideUpSheet = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: springs.liquid },
  exit: { y: '100%', transition: exits.base },
} satisfies Variants;

export const slideRightDrawer = {
  hidden: { x: '100%', opacity: 0.6 },
  visible: { x: 0, opacity: 1, transition: springs.heavy },
  exit: { x: '100%', opacity: 0.6, transition: exits.base },
} satisfies Variants;

export const dialog = {
  hidden: { opacity: 0, scale: 0.96, y: 12, filter: 'blur(8px)' },
  visible: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', transition: springs.snappy },
  exit: { opacity: 0, scale: 0.98, y: 6, filter: 'blur(4px)', transition: exits.fast },
} satisfies Variants;

export const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: exits.fast },
} satisfies Variants;

export const toast = {
  hidden: { opacity: 0, y: -16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springs.bouncy },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: exits.fast },
} satisfies Variants;

/* ---------------------------- micro-interactions -------------------------- */

export const chip = {
  idle: { scale: 1, transition: springs.snappy },
  hover: { scale: 1.04, transition: springs.magnet },
  tap: { scale: 0.96, transition: springs.snappy },
  selected: { scale: 1.02, transition: springs.snappy },
} satisfies Variants;

/** Thumbs / pick: pop with overshoot. */
export const pop = {
  idle: { scale: 1 },
  active: { scale: [1, 1.3, 1], transition: springs.bouncy },
} satisfies Variants;

/** Price / balance tick: brief lift when a number changes. */
export const tick = {
  idle: { y: 0, color: 'inherit' },
  up: { y: [0, -3, 0], transition: springs.snappy },
  down: { y: [0, 3, 0], transition: springs.snappy },
} satisfies Variants;

/** Shield lock on spend-permission approval. */
export const lock = {
  idle: { rotate: 0, scale: 1 },
  locked: { rotate: [0, -10, 0], scale: [1, 1.08, 1], transition: springs.bouncy },
} satisfies Variants;

/** Shake for invalid input / rate limit. */
export const shake = {
  idle: { x: 0 },
  shake: { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } },
} satisfies Variants;

/* ------------------------------- reveals --------------------------------- */

/** Image reveal: radial mask grows from the centre. */
export const circleReveal = {
  hidden: { clipPath: 'circle(0% at 50% 50%)', opacity: 0.6 },
  visible: { clipPath: 'circle(150% at 50% 50%)', opacity: 1, transition: springs.glide },
} satisfies Variants;

/** Compare split: a column wipes in from its edge. */
export const wipeLeft = {
  hidden: { clipPath: 'inset(0 100% 0 0)' },
  visible: { clipPath: 'inset(0 0% 0 0)', transition: springs.heavy },
} satisfies Variants;

export const wipeRight = {
  hidden: { clipPath: 'inset(0 0 0 100%)' },
  visible: { clipPath: 'inset(0 0 0 0%)', transition: springs.heavy },
} satisfies Variants;

/** Losing compare column collapses. */
export const collapseLoser = {
  visible: { scale: 1, opacity: 1 },
  collapsed: { scale: 0.96, opacity: 0, transition: exits.base },
} satisfies Variants;

/** TopUpBar buttons meet in the middle from opposite edges. */
export const meetFromLeft = {
  hidden: { x: -40, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: springs.soft },
} satisfies Variants;

export const meetFromRight = {
  hidden: { x: 40, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: springs.soft },
} satisfies Variants;

/* --------------------------------- loops --------------------------------- */

export const floatLoop = {
  float: {
    y: [0, -10, 0],
    transition: { repeat: Infinity, duration: 6, ease: 'easeInOut' },
  },
} satisfies Variants;

export const pulseLoop = {
  idle: { scale: [1, 1.03, 1], transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' } },
  active: {
    scale: [1, 1.06, 1],
    transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
  },
} satisfies Variants;

/* ------------------------------- layout ---------------------------------- */

/** Props for `motion` elements that reorder (slider re-rank). Spread onto the element. */
export const reorderLayout = { layout: true, transition: springs.glide } as const;

/* ----------------------------- reduced motion ---------------------------- */

/** Opacity-only twin of any entrance set. */
export const reducedFallback = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
} satisfies Variants;

const MOTION_KEYS = new Set([
  'x',
  'y',
  'z',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
  'filter',
  'clipPath',
  'boxShadow',
]);

/**
 * Map a variants object to its reduced-motion form:
 * keeps `opacity`, drops transforms/filters/clip paths, and swaps transitions for short fades.
 * Keyframe arrays collapse to their last value. Infinite loops become static.
 */
export function withReduced<T extends Variants>(variants: T, reduced: boolean): T {
  if (!reduced) return variants;
  const out: Variants = {};
  for (const [name, def] of Object.entries(variants)) {
    if (typeof def === 'function') {
      out[name] = def;
      continue;
    }
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(def)) {
      if (MOTION_KEYS.has(key)) continue;
      if (key === 'transition') continue;
      next[key] = Array.isArray(value) ? value[value.length - 1] : value;
    }
    next.transition = { duration: 0.18 };
    out[name] = next as T[keyof T];
  }
  return out as T;
}

/** Pick full or fallback variants by the reduced flag (for sets with no sensible mapping). */
export function pick<T extends Variants>(reduced: boolean, full: T, fallback: Variants = reducedFallback): T {
  return reduced ? (fallback as T) : full;
}
