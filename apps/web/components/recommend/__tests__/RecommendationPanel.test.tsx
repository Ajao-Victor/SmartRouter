import { fireEvent, render, screen, within } from '@testing-library/react';

import type { QuoteResponse } from '@/lib/api/types';
import { micro } from '@/lib/money';

import { ReducedMotionProvider } from '@/components/layout/ReducedMotionProvider';

import { RecommendationPanel } from '../RecommendationPanel';

const data: QuoteResponse = {
  classification: { task_type: 'writing', complexity: 'short', language: 'en', needs_web: false },
  recommendations: [
    { model_id: 'glm', label: 'GLM 5.3 Flash', provider: 'OpenRouter', price: micro(900), speed_label: 'fast', reason: '80% of the best quality at 1/34 of the price', score: 0.9, quality: 0.8, is_free: false, is_best_quality: false, searches_web: false, quote_id: 'q1' },
    { model_id: 'llama', label: 'Llama 3.3 70B', provider: 'OpenRouter', price: micro(800), speed_label: 'fast', reason: 'fast and cheap', score: 0.85, quality: 0.74, is_free: false, is_best_quality: false, searches_web: false, quote_id: 'q2' },
    { model_id: 'opus', label: 'Claude Opus 5.5', provider: 'Anthropic', price: micro(28_600), speed_label: 'steady', reason: 'Best quality for writing', score: 0.7, quality: 1, is_free: false, is_best_quality: true, searches_web: false, quote_id: 'q3' },
    { model_id: 'free', label: 'Free · Llama 3.1 8B', provider: 'Cloudflare Workers AI', price: micro(0), speed_label: 'fast', reason: 'Never stuck', score: 0, quality: 0.5, is_free: true, is_best_quality: false, searches_web: false, quote_id: null },
  ],
  quote: { id: 'q1', user_id: 'u', chat_id: 'c', model_id: 'glm', prompt_hash: 'h', context_tokens: 10, price: micro(900), est_cost: micro(818), expires_at: new Date(Date.now() + 300_000).toISOString() },
  suggestion: { model_id: 'opus', task_type: 'coding', reason: 'looks like code' },
};

function renderPanel(over: Partial<React.ComponentProps<typeof RecommendationPanel>> = {}) {
  const props = { data, slider: 'balanced' as const, onSliderChange: vi.fn(), selectedModelId: 'glm', onPick: vi.fn(), onAuto: vi.fn(), onApplySuggestion: vi.fn(), ...over };
  render(
    <ReducedMotionProvider forceReduced>
      <RecommendationPanel {...props} />
    </ReducedMotionProvider>,
  );
  return props;
}

describe('RecommendationPanel', () => {
  it('shows four options with the free model labelled exactly and attribution', () => {
    renderPanel();
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'Free · Llama 3.1 8B' })).toBeInTheDocument();
    expect(screen.getByText('Quality data: LMArena, Artificial Analysis')).toBeInTheDocument();
    expect(within(screen.getByRole('option', { name: 'Claude Opus 5.5' })).getByText('Best quality')).toBeInTheDocument();
    expect(within(screen.getByRole('option', { name: 'GLM 5.3 Flash' })).getByText('Top pick')).toBeInTheDocument();
  });

  it('picks a model, runs Auto and applies a suggestion', () => {
    const p = renderPanel();
    fireEvent.click(screen.getByRole('option', { name: 'Claude Opus 5.5' }));
    expect(p.onPick).toHaveBeenCalledWith('opus');
    fireEvent.click(screen.getByRole('button', { name: /Auto/ }));
    expect(p.onAuto).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
    expect(p.onApplySuggestion).toHaveBeenCalledWith('opus');
  });

  it('re-quotes (debounced) when the slider moves', () => {
    vi.useFakeTimers();
    const p = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Best quality' }));
    expect(p.onSliderChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(350);
    expect(p.onSliderChange).toHaveBeenCalledWith('best');
    vi.useRealTimers();
  });
});
