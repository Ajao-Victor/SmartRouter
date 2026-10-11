import { render, screen } from '@testing-library/react';

import { TopBar } from '../TopBar';

vi.mock('next/navigation', () => ({ usePathname: () => '/settings' }));

describe('TopBar', () => {
  it('renders the home link, title, primary links and the right slot', () => {
    render(<TopBar title="Cover letter for Paystack" right={<span>HUD</span>} />);
    expect(screen.getByRole('link', { name: 'SmartRouter home' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Cover letter for Paystack')).toBeInTheDocument();
    expect(screen.getByText('HUD')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New chat' })).toHaveAttribute('href', '/chat');
    expect(screen.getByRole('link', { name: 'Activity' })).toHaveAttribute('href', '/activity');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
  });
});
