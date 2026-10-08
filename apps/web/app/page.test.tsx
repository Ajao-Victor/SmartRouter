import { render, screen } from '@testing-library/react';

import HomePage from './page';

describe('HomePage (Task 1 placeholder)', () => {
  it('renders the pitch line word by word', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Tell SmartRouter what you want done/,
    );
  });

  it('labels the free model honestly', () => {
    render(<HomePage />);
    expect(screen.getByText(/Free · Llama 3\.1 8B/)).toBeInTheDocument();
  });
});
