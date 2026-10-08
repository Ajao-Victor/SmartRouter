import { render } from '@testing-library/react';

import { useFxStore } from '@/stores/fxStore';

import { trailPath } from '../GlowTrail';
import { burstAt } from '../ParticleBurst';
import { RouterOrb } from '../RouterOrb';

describe('fx helpers', () => {
  it('builds a quadratic path through element centres', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    vi.spyOn(a, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 10, height: 10 } as DOMRect);
    vi.spyOn(b, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 0, width: 10, height: 10 } as DOMRect);
    expect(trailPath(a, [b])).toBe('M 5 5 Q 55 -34 105 5');
  });

  it('burstAt maps pointer coords', () => {
    expect(burstAt({ clientX: 3, clientY: 4 }, '#fff', 10)).toEqual({ x: 3, y: 4, color: '#fff', count: 10 });
  });

  it('fx store caps trails and holds the burst handler', () => {
    for (let i = 0; i < 6; i += 1) useFxStore.getState().addTrail({ d: 'M 0 0', color: 'accent' });
    expect(useFxStore.getState().trails).toHaveLength(4);
    const fn = vi.fn();
    useFxStore.getState().setBurstHandler(fn);
    expect(useFxStore.getState().burstHandler).toBe(fn);
  });

  it('RouterOrb renders the CSS fallback without WebGL', () => {
    const { container } = render(<RouterOrb size={32} />);
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
