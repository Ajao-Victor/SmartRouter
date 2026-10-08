import { useState } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { Slider } from '../Slider';

const DETENTS = [{ label: 'Cheapest' }, { label: 'Balanced' }, { label: 'Best quality' }] as const;

function Harness({ initial = 1 }: { initial?: number }) {
  const [v, setV] = useState(initial);
  return <Slider detents={DETENTS} value={v} onChange={setV} aria-label="Price vs quality" />;
}

describe('Slider', () => {
  it('exposes slider semantics', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', { name: 'Price vs quality' });
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '2');
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    expect(slider).toHaveAttribute('aria-valuetext', 'Balanced');
  });

  it('moves between detents with the keyboard', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '2');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '2');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '2');
  });

  it('jumps to a detent when its label is clicked', () => {
    render(<Harness initial={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Best quality' }));
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2');
  });
});
