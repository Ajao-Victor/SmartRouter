import { render, screen } from '@testing-library/react';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

import { NumberTicker } from '../NumberTicker';

describe('NumberTicker', () => {
  it('renders the formatted value instantly under reduced motion', () => {
    render(
      <ReducedMotionProvider forceReduced>
        <NumberTicker value={0.0008} format={(n) => `$${n.toFixed(4)}`} />
      </ReducedMotionProvider>,
    );
    expect(screen.getByText('$0.0008')).toBeInTheDocument();
  });

  it('is announced politely', () => {
    render(<NumberTicker value={42} />);
    expect(screen.getByText('42')).toHaveAttribute('aria-live', 'polite');
  });
});
