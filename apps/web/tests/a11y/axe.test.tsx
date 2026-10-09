import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import axe from 'axe-core';

import { micro } from '@/lib/money';

import HomePage from '@/app/page';

import { TopUpBar } from '@/components/allocation/TopUpBar';
import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';
import { RecommendationPanel } from '@/components/recommend/RecommendationPanel';
import { AllocationControls } from '@/components/wallet/AllocationControls';
import { SpendPermissionCard } from '@/components/wallet/SpendPermissionCard';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/api/endpoints', () => ({ api: { models: { list: vi.fn().mockResolvedValue([]) }, auth: { nonce: vi.fn(), verify: vi.fn(), logout: vi.fn() } } }));

async function serious(container: HTMLElement): Promise<string[]> {
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } }, // jsdom has no layout; contrast is checked manually (UI_UX_Brief §2)
  });
  return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ReducedMotionProvider forceReduced>{ui}</ReducedMotionProvider>
    </QueryClientProvider>,
  );
}

describe('accessibility (axe, serious/critical only)', () => {
  it('landing page', async () => {
    const { container } = wrap(<HomePage />);
    expect(await serious(container)).toEqual([]);
  }, 20_000);

  it('recommendations, top-up bar, allocation controls and spend permission', async () => {
    const { container } = wrap(
      <main>
        <RecommendationPanel
          data={{
            classification: { task_type: 'writing', complexity: 'short', language: 'en', needs_web: false },
            recommendations: [
              { model_id: 'a', label: 'GLM 5.3 Flash', provider: 'OpenRouter', price: micro(900), speed_label: 'fast', reason: 'r', score: 1, quality: 0.8, is_free: false, is_best_quality: false, searches_web: false, quote_id: 'q' },
              { model_id: 'f', label: 'Free · Llama 3.1 8B', provider: 'CF', price: micro(0), speed_label: 'fast', reason: 'r', score: 0, quality: 0.5, is_free: true, is_best_quality: false, searches_web: false, quote_id: null },
            ],
            quote: { id: 'q', user_id: 'u', chat_id: 'c', model_id: 'a', prompt_hash: 'h', context_tokens: 1, price: micro(900), est_cost: micro(818), expires_at: new Date(Date.now() + 300_000).toISOString() },
            suggestion: null,
          }}
          slider="balanced"
          onSliderChange={vi.fn()}
          selectedModelId="a"
          onPick={vi.fn()}
          onAuto={vi.fn()}
        />
        <TopUpBar topUpMicro={micro(2_000_000)} onTopUp={vi.fn()} onContinueFree={vi.fn()} />
        <AllocationControls allocation={micro(2_000_000)} weeklyLimit={micro(10_000_000)} autoFreeFallback onChange={vi.fn()} />
        <SpendPermissionCard status="none" onApprove={vi.fn()} onRevoke={vi.fn()} />
      </main>,
    );
    expect(await serious(container)).toEqual([]);
  }, 20_000);
});
