import { render, screen } from '@testing-library/react';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

import { GlitchText } from '../GlitchText';

describe('GlitchText', () => {
  it('renders plain text under reduced motion', () => {
    render(
      <ReducedMotionProvider forceReduced>
        <GlitchText text="Free · Llama 3.1 8B" as="h2" />
      </ReducedMotionProvider>,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Free · Llama 3.1 8B');
  });

  it('exposes the text once to assistive tech while layers are decorative', () => {
    const { container } = render(<GlitchText text="Cover letter draft" />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('Cover letter draft');
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(1);
  });
});
