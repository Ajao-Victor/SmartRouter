import { fireEvent, render, screen } from '@testing-library/react';

import { useUiStore } from '@/stores/uiStore';

import { TopBar } from '../TopBar';

describe('TopBar', () => {
  it('renders the home link, title and toggles the wallet sheet', () => {
    useUiStore.setState({ walletSheetOpen: false });
    render(<TopBar title="Cover letter for Paystack" right={<span>HUD</span>} />);
    expect(screen.getByRole('link', { name: 'SmartRouter home' })).toHaveAttribute('href', '/');
    expect(screen.getAllByText('Cover letter for Paystack').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('HUD')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wallet' }));
    expect(useUiStore.getState().walletSheetOpen).toBe(true);
  });
});
