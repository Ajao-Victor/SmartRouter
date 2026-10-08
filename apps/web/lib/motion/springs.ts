import type { Transition } from 'motion/react';

/**
 * Spring physics catalogue (design.md §3).
 * Everything in the UI moves on springs, never linear easing. Pick by feel:
 *
 *  snappy  — UI confirmations, selections, chips. Fast settle, no overshoot.
 *  soft    — entrances, panels, bars growing. Gentle, slight overshoot.
 *  liquid  — sheets, HUD ring refills. Heavy mass, organic settle.
 *  magnet  — pointer-tracking offsets (magnetic buttons, tilt). Follows then returns.
 *  bouncy  — celebratory picks, thumbs, burst origins. Visible overshoot.
 *  glide   — layout reorders (slider re-rank). Smooth, no pop.
 *  heavy   — large surfaces (wallet sheet, compare wipe). Slow and weighty.
 */
export const springs = {
  snappy: { type: 'spring', stiffness: 500, damping: 32, mass: 0.6 },
  soft: { type: 'spring', stiffness: 170, damping: 26 },
  liquid: { type: 'spring', stiffness: 90, damping: 18, mass: 1.2 },
  magnet: { type: 'spring', stiffness: 300, damping: 20 },
  bouncy: { type: 'spring', stiffness: 420, damping: 14, mass: 0.8 },
  glide: { type: 'spring', stiffness: 120, damping: 30 },
  heavy: { type: 'spring', stiffness: 60, damping: 20, mass: 1.6 },
} as const satisfies Record<string, Transition>;

export type SpringName = keyof typeof springs;

/** Motion-value spring options (for `useSpring`) — same feel as the transitions above. */
export const springValues = {
  snappy: { stiffness: 500, damping: 32, mass: 0.6 },
  soft: { stiffness: 170, damping: 26 },
  liquid: { stiffness: 90, damping: 18, mass: 1.2 },
  magnet: { stiffness: 300, damping: 20 },
  bouncy: { stiffness: 420, damping: 14, mass: 0.8 },
  glide: { stiffness: 120, damping: 30 },
  heavy: { stiffness: 60, damping: 20, mass: 1.6 },
} as const;

/** Instant transition used under reduced motion. */
export const instant = { duration: 0 } as const satisfies Transition;

/** Short opacity-only tween for reduced-motion fallbacks. */
export const fadeOnly = { duration: 0.18, ease: 'easeOut' } as const satisfies Transition;

/** Exit timings: exits are tweens so unmounts never linger on a spring tail. */
export const exits = {
  fast: { duration: 0.18, ease: 'easeIn' },
  base: { duration: 0.25, ease: 'easeIn' },
} as const satisfies Record<string, Transition>;

/** Drag feel for sheets and the dock (velocity-based dismiss, rubber-band). */
export const dragPhysics = {
  dragElastic: 0.12,
  dragTransition: { bounceStiffness: 300, bounceDamping: 24 },
  /** px/s above which a downward drag dismisses a sheet. */
  dismissVelocity: 500,
  /** Fraction of travel above which a drag dismisses a sheet. */
  dismissTravel: 0.4,
} as const;
