import { exits, instant, springs } from './springs';
import {
  bubble,
  dock,
  fadeUp,
  holoCard,
  hud,
  pick,
  reducedFallback,
  slideUpSheet,
  stagger,
  withReduced,
} from './variants';

describe('springs', () => {
  it('are all spring transitions with the documented physics', () => {
    for (const [, s] of Object.entries(springs)) {
      expect(s.type).toBe('spring');
      expect(s.stiffness).toBeGreaterThan(0);
      expect(s.damping).toBeGreaterThan(0);
    }
    expect(springs.snappy).toMatchObject({ stiffness: 500, damping: 32, mass: 0.6 });
    expect(springs.liquid).toMatchObject({ stiffness: 90, damping: 18, mass: 1.2 });
    expect(springs.magnet).toMatchObject({ stiffness: 300, damping: 20 });
  });

  it('exits are tweens and instant is zero-duration', () => {
    expect(exits.fast.duration).toBeLessThan(0.3);
    expect(instant.duration).toBe(0);
  });
});

describe('variants shape', () => {
  it('exposes the documented state keys', () => {
    expect(Object.keys(fadeUp)).toEqual(['hidden', 'visible', 'exit']);
    expect(Object.keys(holoCard)).toEqual(['rest', 'hover', 'selected', 'tap']);
    expect(Object.keys(dock)).toEqual(['idle', 'focused', 'cooldown']);
    expect(Object.keys(hud)).toEqual(['ok', 'low', 'used', 'toppingUp']);
    expect(Object.keys(bubble)).toEqual(['hidden', 'streaming', 'done', 'error', 'retrying']);
    expect(Object.keys(slideUpSheet)).toEqual(['hidden', 'visible', 'exit']);
  });

  it('stagger builds a container with reversed exit', () => {
    const s = stagger({ each: 0.1, delay: 0.2, direction: 1 });
    expect(s.visible).toMatchObject({
      transition: { staggerChildren: 0.1, delayChildren: 0.2, staggerDirection: 1 },
    });
    expect(s.exit).toMatchObject({ transition: { staggerDirection: -1 } });
  });

  it('importing the library has no side effects on globals', () => {
    expect(typeof window).toBe('object');
    expect(document.body.childElementCount).toBe(0);
  });
});

describe('withReduced', () => {
  it('returns the same object when motion is allowed', () => {
    expect(withReduced(fadeUp, false)).toBe(fadeUp);
  });

  it('strips transforms, filters and springs, keeping opacity', () => {
    const r = withReduced(fadeUp, true);
    expect(r.hidden).toEqual({ opacity: 0, transition: { duration: 0.18 } });
    expect(r.visible).toEqual({ opacity: 1, transition: { duration: 0.18 } });
    expect(r.exit).toEqual({ opacity: 0, transition: { duration: 0.18 } });
  });

  it('collapses keyframe arrays and kills infinite loops', () => {
    const r = withReduced(bubble, true);
    expect(r.retrying).toEqual({ opacity: 1, transition: { duration: 0.18 } });
    expect(r.error).toEqual({ opacity: 1, transition: { duration: 0.18 } });
  });

  it('pick swaps to the fallback set', () => {
    expect(pick(true, fadeUp)).toBe(reducedFallback);
    expect(pick(false, fadeUp)).toBe(fadeUp);
  });
});
