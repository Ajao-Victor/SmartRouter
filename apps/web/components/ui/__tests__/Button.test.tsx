import { fireEvent, render, screen } from '@testing-library/react';

import { Button } from '../Button';
import { MagneticButton } from '../MagneticButton';

describe('Button', () => {
  it('defaults to type=button and fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run</Button>);
    const btn = screen.getByRole('button', { name: 'Run' });
    expect(btn).toHaveAttribute('type', 'button');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and busy while loading', () => {
    render(<Button loading>Run</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('applies variant classes', () => {
    render(
      <>
        <Button variant="free">Free</Button>
        <Button variant="danger">Revoke</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Free' }).className).toMatch(/text-free/);
    expect(screen.getByRole('button', { name: 'Revoke' }).className).toMatch(/text-signal/);
  });

  it('MagneticButton renders a button and survives pointer events', () => {
    render(<MagneticButton>Top up $2</MagneticButton>);
    const btn = screen.getByRole('button', { name: 'Top up $2' });
    fireEvent.pointerMove(btn, { clientX: 10, clientY: 10 });
    fireEvent.pointerLeave(btn);
    expect(btn).toBeInTheDocument();
  });
});
