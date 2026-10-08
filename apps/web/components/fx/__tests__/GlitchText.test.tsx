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

  it('exposes the text to assistive tech while layers are decorative', () => {
    render(<GlitchText text="Cover letter draft" />);
    expect(screen.getByLabelText('Cover letter draft')).toBeInTheDocument();
    expect(screen.getAllByText('Cover letter draft').length).toBeGreaterThanOrEqual(1);
  });
});
