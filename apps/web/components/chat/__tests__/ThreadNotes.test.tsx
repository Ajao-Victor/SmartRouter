import { render, screen } from '@testing-library/react';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

import { ThreadNotes } from '../ThreadNotes';

const wrap = (ui: React.ReactElement) => render(<ReducedMotionProvider forceReduced>{ui}</ReducedMotionProvider>);

describe('ThreadNotes', () => {
  it('explains media turns inside a text chat', () => {
    wrap(<ThreadNotes chatTask="writing" turnTask="image" hasSummary={false} />);
    expect(screen.getByRole('note')).toHaveTextContent(/image turn sends only the new prompt plus a one-line summary/);
  });

  it('mentions the running summary and the 8,000-token cap', () => {
    wrap(<ThreadNotes chatTask="chat" turnTask="chat" hasSummary contextTokens={8000} />);
    const notes = screen.getAllByRole('note');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent(/summarised by the free model/);
  });

  it('renders nothing for an ordinary short text turn', () => {
    wrap(<ThreadNotes chatTask="chat" turnTask="chat" hasSummary={false} contextTokens={120} />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
