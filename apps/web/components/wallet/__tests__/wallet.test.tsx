import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { micro } from '@/lib/money';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

import { AllocationControls } from '../AllocationControls';
import { SpendPermissionCard } from '../SpendPermissionCard';
import { WaitlistForm } from '../WaitlistForm';

const join = vi.fn();
vi.mock('@/lib/api/endpoints', () => ({ api: { waitlist: { join: (i: unknown) => join(i) as Promise<void> } } }));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ReducedMotionProvider forceReduced>{ui}</ReducedMotionProvider>
    </QueryClientProvider>,
  );
}

describe('WaitlistForm', () => {
  it('validates the email and posts email, country and interest', async () => {
    join.mockResolvedValue(undefined);
    wrap(<WaitlistForm interest="naira" />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } });
    fireEvent.submit(screen.getByRole('button', { name: /Join the naira waitlist/ }).closest('form') as HTMLFormElement);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /Join the naira waitlist/ }).closest('form') as HTMLFormElement);
    await waitFor(() => {
      expect(join).toHaveBeenCalledWith({ email: 'ada@example.com', country: 'NG', interest: 'naira' });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/on the waitlist/);
  });
});

describe('AllocationControls', () => {
  it('steps allocation and weekly limit and toggles auto free fallback', () => {
    const onChange = vi.fn();
    wrap(<AllocationControls allocation={micro(2_000_000)} weeklyLimit={micro(10_000_000)} autoFreeFallback onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase Allocation size' }));
    expect(onChange).toHaveBeenCalledWith({ allocation: 3_000_000 });
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Spending limit' }));
    expect(onChange).toHaveBeenCalledWith({ weekly_limit: 5_000_000 });
    fireEvent.click(screen.getByRole('switch', { name: 'Auto free fallback' }));
    expect(onChange).toHaveBeenCalledWith({ auto_free_fallback: false });
  });
});

describe('SpendPermissionCard', () => {
  it('shows the scoped facts and offers approve or revoke by status', () => {
    const onApprove = vi.fn();
    const onRevoke = vi.fn();
    const { rerender } = wrap(<SpendPermissionCard status="none" onApprove={onApprove} onRevoke={onRevoke} />);
    expect(screen.getByText(/USDC\.e/)).toBeInTheDocument();
    expect(screen.getByText('Open and top up sessions only')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve with passkey' }));
    expect(onApprove).toHaveBeenCalled();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ReducedMotionProvider forceReduced>
          <SpendPermissionCard status="granted" expiresAt="2026-11-07T00:00:00Z" onApprove={onApprove} onRevoke={onRevoke} />
        </ReducedMotionProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(onRevoke).toHaveBeenCalled();
  });
});
