import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';

import { micro } from '@/lib/money';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

import { ReceiptView } from '../ReceiptView';
import { TxHashReveal } from '../TxHashReveal';

const HASH = `0x${'ab12'.repeat(16)}`;
const get = vi.fn();
vi.mock('@/lib/api/endpoints', () => ({
  api: { requests: { get: (id: string) => get(id) as Promise<unknown> }, models: { list: vi.fn().mockResolvedValue([]) } },
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ReducedMotionProvider forceReduced>{ui}</ReducedMotionProvider>
    </QueryClientProvider>,
  );
}

describe('TxHashReveal', () => {
  it('exposes the full hash, copies it and links to the explorer', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    wrap(<TxHashReveal hash={HASH} />);
    expect(screen.getByLabelText(`Transaction ${HASH}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy transaction hash' }));
    expect(writeText).toHaveBeenCalledWith(HASH);
    expect(screen.getByRole('link', { name: 'View on Tempo explorer' })).toHaveAttribute('href', expect.stringContaining(HASH));
  });

  it('refuses invalid hashes', () => {
    wrap(<TxHashReveal hash="0xnope" />);
    expect(screen.getByText('invalid hash')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('ReceiptView', () => {
  it('renders the PDF receipt fields and pending settlement', async () => {
    get.mockResolvedValue({
      id: 'req_1', user_id: 'u', quote_id: 'q', chat_id: 'c', channel_id: 'ch_demo_0001', model_id: 'm', is_free: false,
      price: micro(900), provider_cost: micro(818), latency_ms: 1234, provider_receipt: 'mpp_rcpt_1', status: 'done',
      voucher_amount: micro(900), tx_hash: null, created_at: new Date().toISOString(),
    });
    wrap(<ReceiptView requestId="req_1" />);
    expect((await screen.findAllByText('$0.0009')).length).toBeGreaterThanOrEqual(1);
    // provider cost $0.000818 displays rounded to four decimals
    expect(screen.getByText('$0.0008')).toBeInTheDocument();
    expect(screen.getByText('1.2 s')).toBeInTheDocument();
    expect(screen.getByText(/pending · settles every \$1 or hourly/)).toBeInTheDocument();
  });
});
