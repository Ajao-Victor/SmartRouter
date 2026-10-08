import { render, screen } from '@testing-library/react';

import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';

import { ReducedMotionProvider } from './ReducedMotionProvider';

function Probe() {
  const reduced = useReducedMotionSafe();
  return <span data-testid="probe">{reduced ? 'reduced' : 'full'}</span>;
}

describe('ReducedMotionProvider', () => {
  it('defaults to full motion outside any provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('full');
  });

  it('defaults to full motion inside the provider with no OS preference', () => {
    render(
      <ReducedMotionProvider>
        <Probe />
      </ReducedMotionProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('full');
  });

  it('reports reduced when forced by the app', () => {
    render(
      <ReducedMotionProvider forceReduced>
        <Probe />
      </ReducedMotionProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('reduced');
  });
});
