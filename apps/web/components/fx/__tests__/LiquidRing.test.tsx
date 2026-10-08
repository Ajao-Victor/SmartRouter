import { render, screen } from '@testing-library/react';

import { LiquidRing } from '../LiquidRing';

describe('LiquidRing', () => {
  it('is a meter with the level and state exposed', () => {
    render(
      <LiquidRing level={0.42} state="low" aria-label="Allocation remaining">
        $0.84
      </LiquidRing>,
    );
    const meter = screen.getByRole('meter', { name: 'Allocation remaining' });
    expect(meter).toHaveAttribute('aria-valuenow', '0.42');
    expect(meter).toHaveAttribute('data-state', 'low');
    expect(screen.getByText('$0.84')).toBeInTheDocument();
  });
});
